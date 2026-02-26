"""
Shared AI service layer for Offr.

Provides a single, reusable wrapper for Gemini JSON calls with:
  - Structured error taxonomy (safe to serialise to frontend)
  - Configurable timeout (default 25 s) with PROVIDER_TIMEOUT error
  - Up to 2 retries with exponential backoff for transient errors (429, 503, timeout)
  - Safe structured logging — no secrets, no raw prompt content
  - Trace IDs for correlating logs across requests
  - request_id propagation on all error responses

Usage:
    from api.ai_service import call_gemini_json, is_gemini_available, AIError

    result, err, latency_ms = call_gemini_json(prompt, trace_id="abc123")
    if err:
        return JSONResponse(err.to_dict(request_id="abc123"), status_code=err.status_code)
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

# Default call timeout in seconds — override with GEMINI_TIMEOUT_SECONDS env var
_DEFAULT_TIMEOUT_S = 25


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

    def to_dict(self, request_id: Optional[str] = None) -> Dict[str, Any]:
        return {
            "status": "error",
            "error_code": self.code,
            "message": self.message,
            "retryable": self.retryable,
            "request_id": request_id or "",
            "details": self.details,
        }


# ─────────────────────────────────────────────────────────────
# Internal helpers
# ─────────────────────────────────────────────────────────────

def _model_name() -> str:
    return os.getenv("GEMINI_MODEL", "gemini-1.5-flash")


def _timeout_s() -> float:
    try:
        return float(os.getenv("GEMINI_TIMEOUT_SECONDS", str(_DEFAULT_TIMEOUT_S)))
    except (ValueError, TypeError):
        return _DEFAULT_TIMEOUT_S


def _get_client():
    """Return an initialised Gemini client, or None if unavailable."""
    api_key = os.getenv("GEMINI_API_KEY")
    logger.info(
        "[startup] GEMINI_API_KEY set=%s GEMINI_MODEL=%s",
        bool(api_key),
        _model_name(),
    )
    if not api_key:
        return None
    try:
        from google import genai  # type: ignore
        return genai.Client(api_key=api_key)
    except BaseException as e:
        logger.error("[startup] failed to initialise Gemini client: %s", repr(e))
        return None


def _strip_fences(text: str) -> str:
    text = re.sub(r"^```(?:json)?\s*", "", text.strip())
    text = re.sub(r"\s*```$", "", text)
    return text.strip()


def _extract_first_json(text: str) -> Optional[str]:
    """
    Fallback extractor: find the first '{' ... '}' block in text.
    Used when strict json.loads fails (e.g. model added preamble text).
    """
    start = text.find("{")
    if start == -1:
        return None
    depth = 0
    for i, ch in enumerate(text[start:], start):
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return text[start : i + 1]
    return None


def _parse_json_robust(text: str) -> Optional[Dict[str, Any]]:
    """
    Two-stage JSON parser:
      1. strict json.loads on the cleaned text
      2. extract first {...} block and try again
    Returns None if both fail.
    """
    cleaned = _strip_fences(text)
    try:
        result = json.loads(cleaned)
        if isinstance(result, dict):
            return result
    except json.JSONDecodeError:
        pass

    fragment = _extract_first_json(cleaned)
    if fragment:
        try:
            result = json.loads(fragment)
            if isinstance(result, dict):
                return result
        except json.JSONDecodeError:
            pass

    return None


def _classify_error(exc: BaseException) -> AIError:
    s = str(exc).lower()
    if "timeout" in s or "timed out" in s or "deadline" in s:
        return AIError(
            code="PROVIDER_TIMEOUT",
            message="AI provider timed out. Please try again.",
            retryable=True,
            status_code=503,
        )
    if "429" in s or "quota" in s or "rate" in s:
        return AIError(
            code="PROVIDER_RATE_LIMIT",
            message="AI provider rate limit reached. Try again shortly.",
            retryable=True,
            status_code=429,
        )
    if "503" in s or "unavailable" in s or "overloaded" in s:
        return AIError(
            code="PROVIDER_TIMEOUT",
            message="AI provider is temporarily unavailable. Please try again.",
            retryable=True,
            status_code=503,
        )
    return AIError(
        code="INTERNAL_ERROR",
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
    max_retries: int = 2,
    timeout_s: Optional[float] = None,
) -> Tuple[Optional[Dict[str, Any]], Optional[AIError], int]:
    """
    Call Gemini with JSON output mode.

    Returns (result, error, latency_ms).
      - On success:        (dict, None, latency_ms)
      - On parse error:    (None, AIError(PARSE_ERROR), latency_ms)
      - On provider error: (None, AIError(...), latency_ms) after retries
      - If not configured: (None, AIError(AI_UNAVAILABLE), 0)

    Never raises — all failure paths are returned as AIError.

    Retry policy:
      - Retries up to max_retries times for transient errors (timeout, 429, 503).
      - Exponential backoff: 2 s, 4 s between attempts.
      - Parse errors are NOT retried (model already responded, just badly).
    """
    tid = trace_id or uuid.uuid4().hex[:8]
    client = _get_client()
    call_timeout = timeout_s if timeout_s is not None else _timeout_s()

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
    backoff = 2  # seconds; doubles each retry

    while attempt <= max_retries:
        t0 = time.monotonic()
        try:
            # Thread-based timeout: run generate_content in a thread with a deadline
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
                future = executor.submit(
                    client.models.generate_content,
                    model=model,
                    contents=prompt,
                    config=config,
                )
                try:
                    resp = future.result(timeout=call_timeout)
                except concurrent.futures.TimeoutError:
                    raise TimeoutError(f"Gemini call exceeded {call_timeout}s timeout")

            latency_ms = int((time.monotonic() - t0) * 1000)
            raw_text = resp.text or ""

            result = _parse_json_robust(raw_text)
            if result is None:
                logger.warning(
                    "[%s] gemini parse_error latency=%dms raw_response=%r",
                    tid, latency_ms, raw_text,
                )
                return None, AIError(
                    code="PARSE_ERROR",
                    message="AI returned a response that could not be parsed. Please try again.",
                    retryable=True,
                    status_code=502,
                ), latency_ms

            logger.info(
                "[%s] gemini ok model=%s latency=%dms attempt=%d",
                tid, model, latency_ms, attempt,
            )
            return result, None, latency_ms

        except BaseException as e:
            latency_ms = int((time.monotonic() - t0) * 1000)
            last_err = _classify_error(e)
            # Log full error details — status code and body are included in repr(e)
            # for google.genai exceptions which embed the HTTP response.
            logger.warning(
                "[%s] gemini %s attempt=%d/%d latency=%dms exc_type=%s exc_detail=%r",
                tid, last_err.code, attempt, max_retries, latency_ms,
                type(e).__name__, str(e),
            )
            if attempt < max_retries:
                time.sleep(backoff)
                backoff *= 2
            attempt += 1

    return None, last_err, 0
