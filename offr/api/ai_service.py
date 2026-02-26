"""
Shared AI service layer for Offr.

Provides a single, reusable wrapper for Gemini JSON calls with:
  - Structured error taxonomy (safe to serialise to frontend)
  - One retry (2 s delay) for transient provider / rate-limit errors
  - Safe structured logging — no secrets, no raw prompt content
  - Trace IDs for correlating logs across requests

Usage:
    from api.ai_service import call_gemini_json, is_gemini_available, AIError

    result, err, latency_ms = call_gemini_json(prompt, trace_id="abc123")
    if err:
        return JSONResponse(err.to_dict(), status_code=err.status_code)
"""
from __future__ import annotations

import json
import logging
import os
import re
import time
import uuid
from typing import Any, Dict, Optional, Tuple

logger = logging.getLogger("offr.ai")


# ─────────────────────────────────────────────────────────────
# Error taxonomy
# ─────────────────────────────────────────────────────────────

class AIError:
    """Structured AI error — safe to serialise and send to the frontend."""

    def __init__(
        self,
        code: str,
        message: str,
        retryable: bool,
        status_code: int = 500,
        details: Optional[Dict[str, Any]] = None,
    ) -> None:
        self.code = code
        self.message = message
        self.retryable = retryable
        self.status_code = status_code
        self.details = details or {}

    def to_dict(self) -> Dict[str, Any]:
        return {
            "status": "error",
            "error_code": self.code,
            "message": self.message,
            "retryable": self.retryable,
            "details": self.details,
        }


# ─────────────────────────────────────────────────────────────
# Internal helpers
# ─────────────────────────────────────────────────────────────

def _model_name() -> str:
    return os.getenv("GEMINI_MODEL", "gemini-2.5-flash")


def _get_client():
    """Return an initialised Gemini client, or None if unavailable."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return None
    try:
        from google import genai  # type: ignore
        return genai.Client(api_key=api_key)
    except BaseException:
        return None


def _strip_fences(text: str) -> str:
    text = re.sub(r"^```(?:json)?\s*", "", text.strip())
    text = re.sub(r"\s*```$", "", text)
    return text.strip()


def _classify_error(exc: BaseException) -> AIError:
    s = str(exc).lower()
    if "429" in s or "quota" in s or "rate" in s:
        return AIError(
            code="AI_RATE_LIMITED",
            message="AI provider rate limit reached. Try again shortly.",
            retryable=True,
            status_code=429,
        )
    return AIError(
        code="AI_PROVIDER_ERROR",
        message=f"AI provider error ({type(exc).__name__}).",
        retryable=True,
        status_code=502,
    )


# ─────────────────────────────────────────────────────────────
# Public API
# ─────────────────────────────────────────────────────────────

def is_gemini_available() -> bool:
    """Fast check — does not initialise a full client."""
    return bool(os.getenv("GEMINI_API_KEY"))


def call_gemini_json(
    prompt: str,
    trace_id: Optional[str] = None,
    temperature: float = 0.3,
    config_extra: Optional[Dict[str, Any]] = None,
    max_retries: int = 1,
) -> Tuple[Optional[Dict[str, Any]], Optional[AIError], int]:
    """
    Call Gemini with JSON output mode.

    Returns (result, error, latency_ms).
      - On success: (dict, None, latency_ms)
      - On parse error: (None, AIError(AI_PARSE_ERROR), latency_ms)
      - On provider error: (None, AIError(...), 0)  after retries
      - If not configured: (None, AIError(AI_UNAVAILABLE), 0)

    Never raises — all failure paths are returned as AIError.
    """
    tid = trace_id or uuid.uuid4().hex[:8]
    client = _get_client()

    if client is None:
        logger.info("[%s] gemini unavailable (not configured)", tid)
        return None, AIError(
            code="AI_UNAVAILABLE",
            message="AI features are not configured on this deployment.",
            retryable=False,
            status_code=503,
        ), 0

    model = _model_name()
    config: Dict[str, Any] = {
        "temperature": temperature,
        "response_mime_type": "application/json",
    }
    if config_extra:
        config.update(config_extra)

    last_err: Optional[AIError] = None
    attempt = 0

    while attempt <= max_retries:
        t0 = time.monotonic()
        try:
            resp = client.models.generate_content(
                model=model,
                contents=prompt,
                config=config,
            )
            latency_ms = int((time.monotonic() - t0) * 1000)
            result = json.loads(_strip_fences(resp.text))
            logger.info(
                "[%s] gemini ok model=%s latency=%dms attempt=%d",
                tid, model, latency_ms, attempt,
            )
            return result, None, latency_ms

        except json.JSONDecodeError as e:
            latency_ms = int((time.monotonic() - t0) * 1000)
            logger.warning(
                "[%s] gemini json_parse_error latency=%dms err=%s",
                tid, latency_ms, type(e).__name__,
            )
            # Parse errors are not retryable — the model responded, just badly
            return None, AIError(
                code="AI_PARSE_ERROR",
                message="AI returned malformed JSON.",
                retryable=True,
                status_code=502,
            ), latency_ms

        except BaseException as e:
            latency_ms = int((time.monotonic() - t0) * 1000)
            last_err = _classify_error(e)
            logger.warning(
                "[%s] gemini %s attempt=%d latency=%dms err=%s",
                tid, last_err.code, attempt, latency_ms, type(e).__name__,
            )
            if attempt < max_retries:
                time.sleep(2)
            attempt += 1

    return None, last_err, 0
