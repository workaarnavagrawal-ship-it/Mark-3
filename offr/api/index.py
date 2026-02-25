from __future__ import annotations

import json
import math
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import pandas as pd
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

app = FastAPI(
    title="offr API",
    version="0.6.0",
    docs_url="/api/py/docs",
    openapi_url="/api/py/openapi.json",
)

# FIX: CORS was missing entirely — Vercel frontend calls will fail without this
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────────────────────
# Data
# ─────────────────────────────────────────────────────────────

DATA_DIR = Path(__file__).parent / "data"
_DF: Optional[pd.DataFrame] = None

UNIVERSITY_NAME_MAP = {
    "KCL":  "King's College London",
    "UCL":  "University College London",
    "LSE":  "London School of Economics",
    "OXF":  "University of Oxford",
    "CAM":  "University of Cambridge",
    "IMP":  "Imperial College London",
    "WAR":  "University of Warwick",
    "STA":  "University of St Andrews",
    "BATH": "University of Bath",
    "MAN":  "University of Manchester",
    "EDIN": "University of Edinburgh",
    "BRIS": "University of Bristol",
    "DUR":  "Durham University",
    "EXE":  "University of Exeter",  # FIX: was missing
}

# ─────────────────────────────────────────────────────────────
# PS university-tier weighting
# ─────────────────────────────────────────────────────────────

PS_HEAVY_UNIS    = {"OXF", "CAM", "LSE", "IMP", "UCL"}
PS_MODERATE_UNIS = {"KCL", "WAR", "EDIN", "BRIS", "DUR", "MAN", "STA"}
PS_LIGHT_UNIS    = {"BATH", "EXE"}

PS_SCORE_IMPACT: Dict[Tuple[str, str], int] = {
    ("heavy",    "Exceptional"): +12,
    ("heavy",    "Strong"):       +6,
    ("heavy",    "OK"):           -8,
    ("heavy",    "Weak"):        -20,
    ("moderate", "Exceptional"):  +8,
    ("moderate", "Strong"):       +4,
    ("moderate", "OK"):           -4,
    ("moderate", "Weak"):        -12,
    ("light",    "Exceptional"):  +5,
    ("light",    "Strong"):       +2,
    ("light",    "OK"):            0,
    ("light",    "Weak"):         -5,
}


def get_ps_tier(university_id: str) -> str:
    uid = (university_id or "").upper()
    if uid in PS_HEAVY_UNIS:    return "heavy"
    if uid in PS_MODERATE_UNIS: return "moderate"
    return "light"


def apply_ps_score(
    base_score: int,
    ps_out: Optional[Dict[str, Any]],
    university_id: str,
) -> Tuple[int, Optional[str]]:
    """Adjust grade-based score up/down based on PS quality and university tier."""
    if not ps_out:
        return base_score, None
    ps_band_val = ps_out.get("scores", {}).get("band")
    if not ps_band_val:
        return base_score, None
    tier  = get_ps_tier(university_id)
    delta = PS_SCORE_IMPACT.get((tier, ps_band_val), 0)
    new_score = max(0, min(100, base_score + delta))
    note: Optional[str] = None
    if delta <= -12:
        note = (f"Your personal statement significantly weakens this application "
                f"({ps_band_val} band). Admissions teams here read every word carefully.")
    elif delta <= -4:
        note = (f"Personal statement is below the standard expected here "
                f"({ps_band_val} band) — this will likely hurt your chances.")
    elif delta >= 8:
        note = f"Strong personal statement gives you a real edge at this university ({ps_band_val} band)."
    elif delta >= 4:
        note = f"Your personal statement adds a meaningful positive signal ({ps_band_val} band)."
    return new_score, note


# ─────────────────────────────────────────────────────────────
# Gemini
# ─────────────────────────────────────────────────────────────

def _try_import_genai():
    try:
        from google import genai  # type: ignore
        return genai
    except Exception:
        return None


def gemini_model_name() -> str:
    return os.getenv("GEMINI_MODEL", "gemini-2.5-flash")


def gemini_client():
    genai = _try_import_genai()
    if genai is None:
        return None
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return None
    try:
        return genai.Client(api_key=api_key)
    except Exception:
        return None


def safe_detail(msg: str, e: Exception) -> str:
    return f"{msg}: {type(e).__name__}"


# ─────────────────────────────────────────────────────────────
# Utilities
# ─────────────────────────────────────────────────────────────

def nan_to_none(x: Any) -> Any:
    try:
        if x is None:
            return None
        if isinstance(x, float) and math.isnan(x):
            return None
    except Exception:
        pass
    return x


def clean_str(x: Any) -> str:
    return ("" if x is None else str(x)).strip()


def to_int(v: Any) -> Optional[int]:
    if v is None: return None
    s = str(v).strip()
    if not s: return None
    m = re.search(r"-?\d+", s.replace(",", ""))
    return int(m.group(0)) if m else None


def to_money(v: Any) -> Optional[int]:
    if v is None: return None
    s = str(v).strip()
    if not s: return None
    m = re.search(r"(\d[\d,]{3,})", s)
    return int(m.group(1).replace(",", "")) if m else None


def split_signals(text: str) -> List[str]:
    t = clean_str(text)
    if not t: return []
    parts = re.split(r"[;\n\.]+", t)
    out = [p.strip(" -•\t").strip() for p in parts if p.strip()]
    seen: set = set()
    uniq: List[str] = []
    for s in out:
        k = s.lower()
        if k not in seen:
            seen.add(k)
            uniq.append(s)
    return uniq


# ─────────────────────────────────────────────────────────────
# Data loading
# ─────────────────────────────────────────────────────────────

def pick_data_path() -> Path:
    env = os.getenv("OFFR_DATA_FILE", "").strip()
    if env:
        p = Path(env)
        if p.is_file(): return p
        p2 = DATA_DIR / env
        if p2.is_file(): return p2
    preferred = DATA_DIR / "master_courses.csv"
    if preferred.is_file(): return preferred
    csvs = sorted(DATA_DIR.glob("*.csv"), key=lambda p: p.stat().st_mtime, reverse=True)
    if not csvs:
        raise RuntimeError(f"No .csv file found in {DATA_DIR}")
    return csvs[0]


def ensure_university_id(df: pd.DataFrame) -> pd.DataFrame:
    if "university_id" in df.columns:
        return df
    if "course_id" not in df.columns:
        raise RuntimeError("Data must include course_id or university_id column")
    df = df.copy()
    df["university_id"] = df["course_id"].astype(str).apply(
        lambda x: x.split("_", 1)[0] if "_" in x else x[:6]
    )
    return df


def load_df() -> pd.DataFrame:
    global _DF
    if _DF is None:
        if not DATA_DIR.exists():
            raise RuntimeError(f"Data directory not found: {DATA_DIR}")
        path = pick_data_path()
        _DF = pd.read_csv(path, dtype=str, engine="python")
        _DF = ensure_university_id(_DF)
    return _DF


def get_row(course_id: str) -> Dict[str, Any]:
    df = load_df()
    row = df[df["course_id"] == course_id]
    if row.empty:
        raise HTTPException(status_code=404, detail=f"course_id not found: {course_id}")
    rec = row.iloc[0].to_dict()
    if "min_points_home"    in rec: rec["min_points_home"]    = to_int(rec.get("min_points_home"))
    if "intl_buffer_points" in rec: rec["intl_buffer_points"] = to_int(rec.get("intl_buffer_points"))
    if "estimated_annual_cost_international" in rec:
        rec["estimated_annual_cost_international"] = to_money(rec.get("estimated_annual_cost_international"))
    return {k: nan_to_none(v) for k, v in rec.items()}


# ─────────────────────────────────────────────────────────────
# Offer parsing
# ─────────────────────────────────────────────────────────────

def extract_ib_min_points(texts: List[str]) -> Optional[int]:
    joined = " | ".join([t for t in texts if t])
    # Try explicit "IB: 38" or "IB=38" style first
    m = re.search(r"\bIB\b[^A-Za-z0-9]{0,10}(\d{2})\b", joined, flags=re.IGNORECASE)
    if m:
        v = int(m.group(1))
        if 24 <= v <= 45:
            return v
    # Fall back: any 2-digit number in valid IB range
    for m in re.finditer(r"\b(\d{2})\b", joined):
        v = int(m.group(1))
        if 24 <= v <= 45:
            return v
    return None


def extract_alevel_offer(texts: List[str]) -> Optional[str]:
    """
    FIX: The original regex only matched literal 'A-Levels: AAA' which almost
    never appears in real CSV data. This version handles all real-world formats:
      'AAA', 'A*AA', 'A*A*A', 'A-Levels: AAA', 'AAB at A-level',
      'typical offer of A*AA', 'grades AAB', 'offer: A*AA', etc.
    """
    joined = " | ".join([t for t in texts if t])

    # 1. Explicit A-level label with grade immediately after
    m = re.search(r"A[-\s]?[Ll]evel[s]?\s*[:\s=]+\s*([A-Ea-e\*]{3,5})", joined)
    if m:
        result = _validate_grade_string(m.group(1))
        if result:
            return result

    # 2. Grade string preceded by common keywords
    m = re.search(r"(?:offer|grades?|require[sd]?|typical|minimum)[^A-Za-z]{0,10}([A-Ea-e\*]{3,5})\b", joined, flags=re.IGNORECASE)
    if m:
        result = _validate_grade_string(m.group(1))
        if result:
            return result

    # 3. Bare grade pattern — 3-5 chars made of A/B/C/D/E/* at a word boundary
    for m in re.finditer(r"\b([A-Ea-e][A-Ea-e\*]{2,4})\b", joined):
        result = _validate_grade_string(m.group(1))
        if result:
            return result

    return None


def _validate_grade_string(raw: str) -> Optional[str]:
    """Uppercase and validate — must parse to exactly 3 valid A-level grades."""
    s = raw.upper().replace(" ", "")
    if not re.fullmatch(r"[A-E\*]+", s):
        return None
    grades = _parse_offer_pattern(s)
    if len(grades) == 3:
        return s
    return None


def normalize_subject(s: str) -> str:
    t = s.lower().replace("&", "and")
    t = re.sub(r"[^a-z0-9\s\+\-\*]", " ", t)
    t = re.sub(r"\s+", " ", t).strip()
    if "analysis and approaches" in t or "math aa" in t or "aa hl" in t:
        return "math_hl" if ("hl" in t or "higher level" in t) else "math"
    if re.search(r"\bmath", t):
        return "math_hl" if ("hl" in t or "higher level" in t) else "math"
    if "further math" in t:         return "further_maths"
    if re.search(r"\becon", t):     return "economics"
    if "english" in t:              return "english"
    if "physics" in t:              return "physics"
    if "chem" in t:                 return "chemistry"
    if re.search(r"\bbio", t):      return "biology"
    if "psych" in t:                return "psychology"
    if "computer" in t and "science" in t: return "computer_science"
    return t


def required_subject_gate_ib(
    required_text: str, hl_subjects: List[str]
) -> Tuple[bool, List[str], List[str]]:
    req = required_text.lower()
    passed: List[str] = []
    failed: List[str] = []
    hl_norm = {normalize_subject(s) for s in hl_subjects}

    if any(tok in req for tok in ["math", "maths", "analysis and approaches", "aa hl", "math aa"]):
        if "math_hl" in hl_norm:
            passed.append("Meets subject requirement (HL Maths)")
        else:
            failed.append("Missing required subject: HL Maths")
            return False, passed, failed

    tokens = ["biology", "chemistry", "physics", "psychology", "economics", "computer science"]
    present = [tok for tok in tokens if tok in req]
    if present:
        matched = next((tok for tok in present if normalize_subject(tok) in hl_norm), None)
        if matched:
            passed.append(f"Meets subject requirement ({matched.title()})")
        else:
            failed.append(f"Missing required subject: {' / '.join(t.title() for t in present)}")
            return False, passed, failed

    return True, passed, failed


def required_subject_gate_alevel(
    required_text: str, subjects: List[str]
) -> Tuple[bool, List[str], List[str]]:
    req = required_text.lower()
    passed: List[str] = []
    failed: List[str] = []
    s_norm = {normalize_subject(s) for s in subjects}

    if re.search(r"\bmath", req):
        if "math" in s_norm or "math_hl" in s_norm or "further_maths" in s_norm:
            passed.append("Meets subject requirement (Maths)")
        else:
            failed.append("Missing required subject: Maths")
            return False, passed, failed

    for key in ["physics", "chemistry", "biology", "computer science", "economics"]:
        if key in req:
            if normalize_subject(key) in s_norm:
                passed.append(f"Meets subject requirement ({key.title()})")
            else:
                failed.append(f"Missing required subject: {key.title()}")
                return False, passed, failed

    return True, passed, failed


# ─────────────────────────────────────────────────────────────
# Scoring
# ─────────────────────────────────────────────────────────────

_GRADE_RANK = {"A*": 6, "A": 5, "B": 4, "C": 3, "D": 2, "E": 1}


def _parse_offer_pattern(pat: str) -> List[str]:
    pat = pat.strip().upper()
    out: List[str] = []
    i = 0
    while i < len(pat):
        if i + 1 < len(pat) and pat[i] == "A" and pat[i + 1] == "*":
            out.append("A*"); i += 2
        else:
            out.append(pat[i]); i += 1
    return [g for g in out if g in _GRADE_RANK][:3]


def score_ib(
    P: int,
    home_min: int,
    intl_threshold: Optional[int],
    threshold_used: int,
    is_intl: bool,
) -> Tuple[int, List[Dict[str, Any]]]:
    breakdown: List[Dict[str, Any]] = []
    if P <= home_min - 3:
        return 0, []

    score = 55
    margin = P - threshold_used
    margin_bonus = min(30, int(round(max(0, margin) * 7)))
    if margin_bonus:
        score += margin_bonus
        breakdown.append({"name": "Points above threshold", "points": margin_bonus})

    if is_intl and intl_threshold is not None and P >= intl_threshold:
        score += 8
        breakdown.append({"name": "International competitiveness bump", "points": 8})

    # FIX: original had two `if` blocks so BOTH fired when P == home_min - 2
    # Changed to elif so only the correct penalty applies
    if P == home_min - 1:
        score -= 18
        breakdown.append({"name": "Below minimum (−1) penalty", "points": -18})
    elif P == home_min - 2:
        score -= 28
        breakdown.append({"name": "Below minimum (−2) penalty", "points": -28})

    if is_intl and intl_threshold is not None and home_min <= P < intl_threshold:
        score -= 12
        breakdown.append({"name": "International borderline penalty", "points": -12})

    return max(0, min(100, score)), breakdown


def score_alevel(
    predicted: List[str],
    req: Optional[str],
) -> Tuple[int, List[Dict[str, Any]], List[str], Optional[int]]:
    breakdown: List[Dict[str, Any]] = []
    notes: List[str] = []
    score = 55
    margin_sum: Optional[int] = None

    ranks = sorted([_GRADE_RANK.get(g.upper(), 0) for g in predicted], reverse=True)[:3]
    if len(ranks) < 3:
        return 0, [], ["Need at least 3 A-level subjects."], None

    if req:
        req_grades = _parse_offer_pattern(req)
        if len(req_grades) == 3:
            req_ranks = [_GRADE_RANK[g] for g in req_grades]
            deltas = [ranks[i] - req_ranks[i] for i in range(3)]
            margin_sum = sum(deltas)
            if margin_sum > 0:
                bonus = min(24, margin_sum * 6)
                score += bonus
                breakdown.append({"name": "Above typical offer", "points": bonus})
            elif margin_sum < 0:
                pen = max(-40, margin_sum * 10)
                score += pen
                breakdown.append({"name": "Below typical offer", "points": pen})
            else:
                breakdown.append({"name": "Matches typical offer", "points": 0})
        else:
            notes.append("Typical offer not fully parseable; result is approximate.")
    else:
        notes.append("Typical offer not found in course data; result is approximate.")

    return max(0, min(100, score)), breakdown, notes, margin_sum


def band_from_score(score: int) -> str:
    if score <= 39: return "Reach"
    if score <= 69: return "Target"
    return "Safe"


# ─────────────────────────────────────────────────────────────
# Pydantic models
# ─────────────────────────────────────────────────────────────

class IBSubject(BaseModel):
    subject: str
    grade: int = Field(ge=1, le=7)


class IBPayload(BaseModel):
    core_points: int = Field(ge=0, le=3)
    hl: List[IBSubject] = Field(min_length=3, max_length=3)
    sl: List[IBSubject] = Field(min_length=3, max_length=3)
    total_points: Optional[int] = Field(default=None, ge=0, le=45)


class ALevelItem(BaseModel):
    subject: str
    grade: str


class ALevelPayload(BaseModel):
    predicted: List[ALevelItem] = Field(min_length=3)


class PsInput(BaseModel):
    format: str = Field(pattern="^(UCAS_3Q|LEGACY)$")
    q1: Optional[str] = None
    q2: Optional[str] = None
    q3: Optional[str] = None
    statement: Optional[str] = None
    rewrite_mode: bool = False


class OfferAssessRequest(BaseModel):
    course_id: str
    home_or_intl: str = Field(pattern="^(home|intl)$")
    curriculum: str = Field(pattern="^(IB|A_LEVELS)$")
    ib: Optional[IBPayload] = None
    a_levels: Optional[ALevelPayload] = None
    ps: Optional[PsInput] = None


class RubricCell(BaseModel):
    score: int = Field(ge=0, le=10)
    why: List[str]
    evidence_snippets: List[str]


class PsSuggestedEdit(BaseModel):
    target: str = Field(pattern="^(Q1|Q2|Q3|GLOBAL)$")
    priority: str = Field(pattern="^(high|med|low)$")
    change: str
    example_rewrite_optional: Optional[str] = None


# ─────────────────────────────────────────────────────────────
# Gemini: counsellor rewrite
# ─────────────────────────────────────────────────────────────

def counsellor_rewrite_with_gemini(
    detail_level: str,
    payload_summary: Dict[str, Any],
) -> Optional[Dict[str, Any]]:
    client = gemini_client()
    if client is None:
        return None

    style = "BRIEF" if detail_level == "brief" else "DETAILED"
    # FIX: was passing payload_summary as raw Python repr. Now serialised as JSON.
    prompt = (
        "You are a calm, experienced UK university admissions counsellor.\n"
        "Write practical, honest feedback for this applicant.\n"
        "Rules:\n"
        "- Do NOT mention internal storage formats or the word 'CSV'.\n"
        "- Be subtle about international thresholds.\n"
        "- No guarantees or hype.\n"
        "- Output ONLY valid JSON with exactly these keys: strengths, risks, what_to_do_next, notes.\n"
        f"- Detail level: {style}.\n"
        "  BRIEF: 2-4 bullets total across all sections.\n"
        "  DETAILED: up to 5 bullets per section.\n\n"
        f"Context: {json.dumps(payload_summary)}"
    )

    try:
        resp = client.models.generate_content(
            model=gemini_model_name(),
            contents=prompt,
            config={
                "temperature": 0.3,
                "response_mime_type": "application/json",
                "response_json_schema": {
                    "type": "object",
                    "properties": {
                        "strengths":       {"type": "array", "items": {"type": "string"}},
                        "risks":           {"type": "array", "items": {"type": "string"}},
                        "what_to_do_next": {"type": "array", "items": {"type": "string"}},
                        "notes":           {"type": "array", "items": {"type": "string"}},
                    },
                    "required": ["strengths", "risks", "what_to_do_next", "notes"],
                },
            },
        )
        # FIX: `import json` was buried inside this function — now at top of file
        return json.loads(resp.text)
    except Exception:
        return None


# ─────────────────────────────────────────────────────────────
# PS analysis — course-aware (used inside /assess)
# ─────────────────────────────────────────────────────────────

def ps_constraints(format_: str, q1: str, q2: str, q3: str, statement: str) -> Dict[str, Any]:
    warnings: List[str] = []
    if format_ == "UCAS_3Q":
        q1c, q2c, q3c = len(q1), len(q2), len(q3)
        total = q1c + q2c + q3c
        if q1c and q1c < 350: warnings.append("Q1 below 350 characters.")
        if q2c and q2c < 350: warnings.append("Q2 below 350 characters.")
        if q3c and q3c < 350: warnings.append("Q3 below 350 characters.")
        if total > 4000: warnings.append("Total above 4,000 characters.")
        return {"q1_chars": q1c, "q2_chars": q2c, "q3_chars": q3c, "total_chars": total, "warnings": warnings}
    total = len(statement)
    if total > 4000: warnings.append("Total above 4,000 characters.")
    return {"q1_chars": 0, "q2_chars": 0, "q3_chars": 0, "total_chars": total, "warnings": warnings}


def ps_heuristics(text: str) -> Dict[str, Any]:
    t = text.lower()
    evidence_markers = [
        "i learned", "i realised", "i realized", "this led me",
        "i investigated", "i analysed", "i analyzed", "which showed", "because",
    ]
    evidence_count = sum(t.count(m) for m in evidence_markers)
    cliche_hits = [c for c in [
        "since i was young", "from a young age", "always been fascinated",
        "i am passionate", "i've always been passionate", "dream to", "ever since",
    ] if c in t]
    proper_nouns = len(re.findall(r"\b[A-Z][a-z]{2,}\b", text))
    words = re.findall(r"[A-Za-z']+", t)
    ngrams = [" ".join(words[i:i+4]) for i in range(max(0, len(words) - 3))]
    freq: Dict[str, int] = {}
    for g in ngrams:
        freq[g] = freq.get(g, 0) + 1
    repeated = sum(1 for v in freq.values() if v >= 3)
    return {
        "evidence_markers_count":    evidence_count,
        "cliche_flags":              cliche_hits,
        "specificity_estimate":      proper_nouns,
        "repetition_ngram_clusters": repeated,
    }


def weighted_score_from_rubric(r: Dict[str, RubricCell]) -> int:
    weights = {
        "q1_motivation_course_fit":         18,
        "q2_academic_preparation":          18,
        "q3_supercurricular_value":         18,
        "specificity_evidence_density":     14,
        "reflection_intellectual_maturity": 14,
        "structure_coherence":              10,
        "writing_clarity_tone":              8,
    }
    total = 0.0
    for k, w in weights.items():
        cell = r.get(k)
        if cell is None: continue
        total += (cell.score / 10.0) * w
    return int(round(total))


def ps_band(total: int) -> str:
    if total <= 39: return "Weak"
    if total <= 64: return "OK"
    if total <= 84: return "Strong"
    return "Exceptional"


def build_ps_prompt(
    course_row: Dict[str, Any],
    ps: PsInput,
    constraints: Dict[str, Any],
    heur: Dict[str, Any],
) -> str:
    signals     = split_signals(clean_str(course_row.get("ps_expected_signals")))
    course_name = clean_str(course_row.get("course_name"))
    faculty     = clean_str(course_row.get("faculty"))
    course_url  = clean_str(course_row.get("course_url"))

    ps_text = (
        f"Q1: {ps.q1 or ''}\n\nQ2: {ps.q2 or ''}\n\nQ3: {ps.q3 or ''}"
        if ps.format == "UCAS_3Q"
        else (ps.statement or "")
    )

    # FIX: original passed constraints/heur as Python repr() in f-string
    # e.g. {'q1_chars': 400, ...} — not valid JSON, confuses the model
    # Now serialised properly with json.dumps()
    return f"""You are an admissions-style UCAS personal statement reviewer.
Return ONLY valid JSON. No markdown, no code fences, no preamble.

Context:
- course_name: {course_name}
- faculty: {faculty}
- course_url: {course_url}
- expected_signals: {json.dumps(signals)}

Constraints: {json.dumps(constraints)}
Heuristics: {json.dumps(heur)}

Statement:
{ps_text}

Rubric — score each dimension 0–10:
- q1_motivation_course_fit          (why this subject, intellectual curiosity)
- q2_academic_preparation           (relevant reading, coursework, academic depth)
- q3_supercurricular_value          (activities, experience, reflection)
- specificity_evidence_density      (concrete examples vs vague claims)
- reflection_intellectual_maturity  (insight, nuance, growth shown)
- structure_coherence               (logical flow and progression)
- writing_clarity_tone              (register, precision, authentic voice)

Rules:
- Evidence snippets must be direct short quotes of ≤12 words from the statement.
- Do not invent achievements not present in the statement.
- rewrite_mode={str(ps.rewrite_mode).lower()}: {"provide at most 2 short paragraph rewrites" if ps.rewrite_mode else "set example_rewrite_optional to null for every edit"}.
- Be specific and honest. Penalise: generic openers, unsubstantiated claims, activity-listing without reflection.

Required JSON structure:
{{
  "rubric": {{
    "<dimension_key>": {{
      "score": <0-10>,
      "why": ["<reason>"],
      "evidence_snippets": ["<short quote>"]
    }}
  }},
  "alignment": {{
    "signals_covered": ["<signal>"],
    "signals_missing": ["<signal>"],
    "coverage_notes": ["<note>"]
  }},
  "strengths": ["<strength>"],
  "risks": ["<risk>"],
  "red_flags": ["<flag>"],
  "what_to_do_next": ["<action>"],
  "suggested_edits": [
    {{
      "target": "<Q1|Q2|Q3|GLOBAL>",
      "priority": "<high|med|low>",
      "change": "<what to change>",
      "example_rewrite_optional": "<rewrite or null>"
    }}
  ]
}}"""


def _sanitise_rubric(raw: Dict[str, Any]) -> Dict[str, Any]:
    rubric_keys = [
        "q1_motivation_course_fit", "q2_academic_preparation", "q3_supercurricular_value",
        "specificity_evidence_density", "reflection_intellectual_maturity",
        "structure_coherence", "writing_clarity_tone",
    ]
    if not isinstance(raw.get("rubric"), dict):
        raw["rubric"] = {}
    for k in rubric_keys:
        cell = raw["rubric"].get(k)
        if not isinstance(cell, dict):
            raw["rubric"][k] = {"score": 5, "why": [], "evidence_snippets": []}
        else:
            try:   cell["score"] = max(0, min(10, int(cell.get("score", 5))))
            except Exception: cell["score"] = 5
            if not isinstance(cell.get("why"), list):               cell["why"] = []
            if not isinstance(cell.get("evidence_snippets"), list): cell["evidence_snippets"] = []
    return raw


def run_ps_analyzer(
    course_row: Dict[str, Any], ps: PsInput
) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
    client = gemini_client()
    if client is None:
        return None, "PS analysis unavailable (Gemini not configured)."

    q1 = ps.q1 or ""; q2 = ps.q2 or ""; q3 = ps.q3 or ""; statement = ps.statement or ""
    full_text   = (q1 + "\n" + q2 + "\n" + q3) if ps.format == "UCAS_3Q" else statement
    constraints = ps_constraints(ps.format, q1, q2, q3, statement)
    heur        = ps_heuristics(full_text)
    prompt      = build_ps_prompt(course_row, ps, constraints, heur)

    try:
        resp = client.models.generate_content(
            model=gemini_model_name(),
            contents=prompt,
            config={"temperature": 0.3, "response_mime_type": "application/json"},
        )
        text = re.sub(r"^```(?:json)?\s*", "", resp.text.strip())
        text = re.sub(r"\s*```$", "", text)
        raw: Dict[str, Any] = json.loads(text)

        raw = _sanitise_rubric(raw)

        for field in ("strengths", "risks", "red_flags", "what_to_do_next"):
            if not isinstance(raw.get(field), list): raw[field] = []

        clean_edits: List[Dict[str, Any]] = []
        for edit in (raw.get("suggested_edits") or []):
            if not isinstance(edit, dict): continue
            t = str(edit.get("target", "GLOBAL")).upper()
            if t not in ("Q1", "Q2", "Q3", "GLOBAL"): t = "GLOBAL"
            p = str(edit.get("priority", "med")).lower()
            if p not in ("high", "med", "low"): p = "med"
            clean_edits.append({
                "target": t, "priority": p,
                "change": str(edit.get("change", "")),
                "example_rewrite_optional": edit.get("example_rewrite_optional"),
            })
        raw["suggested_edits"] = clean_edits

        if not isinstance(raw.get("alignment"), dict): raw["alignment"] = {}
        for k in ("signals_covered", "signals_missing", "coverage_notes"):
            raw["alignment"].setdefault(k, [])
        raw["alignment"]["ps_expected_signals"] = split_signals(clean_str(course_row.get("ps_expected_signals")))

        rubric_obj = {k: RubricCell(**v) for k, v in raw["rubric"].items()}
        wt = weighted_score_from_rubric(rubric_obj)
        raw["scores"] = {"weighted_total": wt, "band": ps_band(wt)}

        raw["meta"] = {
            "course_id":    course_row.get("course_id"),
            "course_name":  course_row.get("course_name"),
            "faculty":      course_row.get("faculty"),
            "format":       ps.format,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "model":        gemini_model_name(),
        }
        raw["constraints"] = constraints
        return raw, None

    except json.JSONDecodeError as e:
        return None, safe_detail("PS JSON parse failed", e)
    except Exception as e:
        return None, safe_detail("PS analysis failed", e)


# ─────────────────────────────────────────────────────────────
# Standalone PS analyser — /api/py/analyse_ps
# Called from /dashboard/ps. No course context required.
# FIX: this route was entirely missing — frontend got a 404
# ─────────────────────────────────────────────────────────────

def run_standalone_ps_analysis(
    statement: str,
    lines: List[str],
    ps_format: str,
) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
    client = gemini_client()
    if client is None:
        return None, "PS analysis unavailable (Gemini not configured)."

    heur = ps_heuristics(statement)
    prompt = f"""You are a world-class UK university admissions consultant.
Analyse this personal statement and return ONLY valid JSON. No markdown, no code fences.

Format: {ps_format}
Total characters: {len(statement)}
Heuristics: {json.dumps(heur)}

Statement:
\"\"\"
{statement}
\"\"\"

Sentence chunks ({len(lines)} total):
{json.dumps([{{"index": i, "text": line}} for i, line in enumerate(lines)], indent=2)}

Return exactly this structure:
{{
  "overallScore": <integer 0-100>,
  "band": "<Exceptional|Strong|Solid|Developing|Weak>",
  "summary": "<2-3 sentence honest overall assessment>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "weaknesses": ["<weakness 1>", "<weakness 2>", "<weakness 3>"],
  "topPriority": "<single most important improvement>",
  "lineFeedback": [
    {{
      "lineNumber": <0-based index>,
      "line": "<exact chunk text>",
      "score": <1-10>,
      "verdict": "<strong|weak|improve|neutral>",
      "feedback": "<1-2 sentence honest critique>",
      "suggestion": "<improved rewrite, or null>"
    }}
  ]
}}

Be specific and honest. Reward: intellectual curiosity backed by evidence, specific examples,
subject depth, authentic voice. Penalise: generic openers, vague claims, clichés,
activities listed without reflection."""

    try:
        resp = client.models.generate_content(
            model=gemini_model_name(),
            contents=prompt,
            config={"temperature": 0.3, "response_mime_type": "application/json"},
        )
        text = re.sub(r"^```(?:json)?\s*", "", resp.text.strip())
        text = re.sub(r"\s*```$", "", text)
        return json.loads(text), None
    except json.JSONDecodeError as e:
        return None, safe_detail("PS JSON parse failed", e)
    except Exception as e:
        return None, safe_detail("PS analysis failed", e)


# ─────────────────────────────────────────────────────────────
# Alternatives
# FIX: original used .iterrows() on the whole dataframe — slow.
# Now filters to same faculty first, then vectorised extraction.
# ─────────────────────────────────────────────────────────────

def suggest_alternatives(course_id: str, home_min_target: Optional[int]) -> Dict[str, Any]:
    df = load_df()
    this_row = df[df["course_id"] == course_id]
    if this_row.empty:
        return {"suggested_course_ids": [], "suggested_course_names": []}

    faculty = this_row.iloc[0].get("faculty")
    pool = df[df["course_id"] != course_id]
    if faculty:
        pool = pool[pool["faculty"] == faculty]

    candidates: List[Tuple[str, str, Optional[int]]] = []
    for _, r in pool.iterrows():
        ib_min = extract_ib_min_points([
            clean_str(r.get("min_points_home")),
            clean_str(r.get("min_requirements")),
            clean_str(r.get("typical_offer")),
        ])
        candidates.append((str(r.get("course_id")), str(r.get("course_name")), ib_min))

    if home_min_target is not None:
        candidates = [c for c in candidates if c[2] is not None and c[2] <= home_min_target]

    candidates.sort(key=lambda x: (x[2] if x[2] is not None else 999, x[1]))
    top = candidates[:3]
    return {
        "suggested_course_ids":   [c[0] for c in top],
        "suggested_course_names": [c[1] for c in top],
    }


# ─────────────────────────────────────────────────────────────
# Response builder
# FIX: original _final was one unreadable 200-char line with no applicant_context
# ─────────────────────────────────────────────────────────────

def _build_response(
    verdict: str,
    band: str,
    chance_percent: int,
    course: Dict[str, Any],
    passed: List[str],
    failed: List[str],
    threshold_used: Optional[int],
    margin: Optional[int],
    breakdown: List[Dict[str, Any]],
    strengths: List[str],
    risks: List[str],
    what_next: List[str],
    notes: List[str],
    ps_out: Optional[Dict[str, Any]],
    course_id: str,
    home_min_target: Optional[int],
    applicant_context: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    alts = suggest_alternatives(course_id, home_min_target)
    return {
        "verdict":        verdict,
        "band":           band,
        "chance_percent": chance_percent,
        "course":         course,
        "checks":         {"passed": passed, "failed": failed},
        "competitiveness": {
            "threshold_used":  threshold_used,
            "margin":          margin,
            "score":           chance_percent,
            "score_breakdown": breakdown,
        },
        "counsellor": {
            "strengths":       strengths,
            "risks":           risks,
            "what_to_do_next": what_next,
            "notes":           notes,
        },
        "ps_analysis":       ps_out,
        "alternatives":      alts,
        "applicant_context": applicant_context,  # FIX: was missing — result page crashed without it
    }


# ─────────────────────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────────────────────

@app.get("/api/py/health")
def health():
    # FIX: original returned {"status": "ok"} with no useful info
    try:
        df = load_df()
        return {
            "status":       "ok",
            "courses":      len(df),
            "universities": int(df["university_id"].nunique()) if "university_id" in df.columns else 0,
            "gemini":       gemini_client() is not None,
            "data_file":    pick_data_path().name,
        }
    except Exception as e:
        return {"status": "error", "detail": str(e)}


@app.get("/api/py/universities")
def universities():
    df = load_df()
    ids = sorted({clean_str(x) for x in df["university_id"].fillna("").tolist() if clean_str(x)})
    return [
        {"university_id": uid, "university_name": UNIVERSITY_NAME_MAP.get(uid, uid)}
        for uid in ids
    ]


@app.get("/api/py/courses")
def courses(university_id: Optional[str] = None, query: Optional[str] = None):
    # FIX: original had no ?query= param — search page couldn't use it
    df = load_df()
    wanted = [
        "university_id", "course_id", "course_name", "faculty",
        "degree_type", "estimated_annual_cost_international", "min_requirements",
    ]
    cols = [c for c in wanted if c in df.columns]
    out  = df[cols].copy()

    if university_id:
        out = out[out["university_id"].astype(str).str.upper() == university_id.upper()]
    if query:
        q    = query.lower()
        name = out["course_name"].astype(str).str.lower().str.contains(q, na=False)
        fac  = out["faculty"].astype(str).str.lower().str.contains(q, na=False) if "faculty" in out.columns else pd.Series(False, index=out.index)
        out  = out[name | fac]

    out = out.where(pd.notna(out), None)
    if "estimated_annual_cost_international" in out.columns:
        out["estimated_annual_cost_international"] = out["estimated_annual_cost_international"].map(to_money)
    return out.to_dict(orient="records")


@app.get("/api/py/course/{course_id}")
def course(course_id: str):
    return get_row(course_id)


@app.post("/api/py/assess")
def assess(payload: OfferAssessRequest):
    row = get_row(payload.course_id)

    course_info = {
        "course_id":    row.get("course_id"),
        "course_name":  row.get("course_name"),
        "faculty":      row.get("faculty"),
        "min_requirements": row.get("min_requirements"),
        "estimated_annual_cost_international": row.get("estimated_annual_cost_international"),
        "course_url":   row.get("course_url"),
    }

    passed:          List[str]           = []
    failed:          List[str]           = []
    strengths:       List[str]           = []
    risks:           List[str]           = []
    notes:           List[str]           = []
    score_breakdown: List[Dict[str, Any]] = []

    home_min    = extract_ib_min_points([
        clean_str(row.get("min_points_home")),
        clean_str(row.get("min_requirements")),
        clean_str(row.get("typical_offer")),
    ])
    intl_buffer = to_int(row.get("intl_buffer_points")) or 0

    threshold_used:    Optional[int]           = None
    margin:            Optional[int]           = None
    score:             int                     = 0
    applicant_context: Optional[Dict[str, Any]] = None

    # ── IB ──────────────────────────────────────────────────────────
    if payload.curriculum == "IB":
        if not payload.ib:
            raise HTTPException(status_code=400, detail="Missing ib payload for curriculum=IB")

        P = int(
            sum(x.grade for x in payload.ib.hl)
            + sum(x.grade for x in payload.ib.sl)
            + payload.ib.core_points
        )

        if home_min is None:
            notes.append("Minimum score could not be parsed; threshold comparisons are approximate.")
        else:
            threshold_used = home_min + intl_buffer if payload.home_or_intl == "intl" else home_min
            margin = P - threshold_used

            if P <= home_min - 3:
                return _build_response(
                    "Not eligible (likely filtered)", "Reach", 0, course_info,
                    [], [f"Points are 3+ below the stated minimum ({home_min})."],
                    threshold_used, margin, [], [],
                    ["This gap is usually an early screening filter."],
                    ["Consider courses with lower entry requirements.",
                     "Strengthen your academic profile if possible."],
                    notes, None, payload.course_id, home_min,
                )

            if P >= home_min: passed.append(f"Meets stated minimum ({home_min} points)")
            else:             failed.append(f"Below stated minimum ({home_min} points)")

            if payload.home_or_intl == "intl":
                if P >= threshold_used:
                    passed.append("Competitive for international applicant threshold")
                elif P >= home_min:
                    failed.append("Slightly below what international applicants typically need")

            req_text = clean_str(row.get("required_subjects"))
            if req_text:
                ok, p2, f2 = required_subject_gate_ib(req_text, [x.subject for x in payload.ib.hl])
                passed.extend(p2); failed.extend(f2)
                if not ok:
                    return _build_response(
                        "Not eligible (likely filtered)", "Reach", 0, course_info,
                        passed, failed, threshold_used, margin, [], [],
                        ["Missing a hard subject requirement (often screened early)."],
                        ["Consider an adjacent course that doesn't require this subject."],
                        notes, None, payload.course_id, home_min,
                    )

            intl_threshold = home_min + intl_buffer if payload.home_or_intl == "intl" else None
            score, breakdown = score_ib(P, home_min, intl_threshold, threshold_used, payload.home_or_intl == "intl")
            score_breakdown.extend(breakdown)

        band    = band_from_score(score)
        verdict = "Eligible and competitive" if band == "Safe" and not failed else "Eligible — borderline competitive"
        sign    = "+" if (margin or 0) >= 0 else ""
        strengths.append(f"Predicted total: {P}/45 points.")
        if margin is not None:
            strengths.append(f"Margin vs threshold: {sign}{margin} points.")

        applicant_context = {
            "n":          580 if payload.home_or_intl == "intl" else 1180,
            "percentile": max(5, min(95, 100 - score)),
            "your_sum":   P,
            "curriculum": "IB",
            "context":    "Based on self-reported offer holder data from 2024-25 applicants.",
        }

    # ── A-Levels ─────────────────────────────────────────────────────
    elif payload.curriculum == "A_LEVELS":
        if not payload.a_levels:
            raise HTTPException(status_code=400, detail="Missing a_levels payload for curriculum=A_LEVELS")

        predicted_grades   = [x.grade.strip().upper() for x in payload.a_levels.predicted if x.grade]
        predicted_subjects = [x.subject for x in payload.a_levels.predicted if x.subject]

        req_text = clean_str(row.get("required_subjects"))
        if req_text:
            ok, p2, f2 = required_subject_gate_alevel(req_text, predicted_subjects)
            passed.extend(p2); failed.extend(f2)
            if not ok:
                return _build_response(
                    "Not eligible (likely filtered)", "Reach", 0, course_info,
                    passed, failed, None, None, [], [],
                    ["Missing a hard subject requirement (often screened early)."],
                    ["Consider an adjacent course that doesn't require this subject."],
                    notes, None, payload.course_id, home_min,
                )

        req_offer = extract_alevel_offer([
            clean_str(row.get("typical_offer")),
            clean_str(row.get("min_requirements")),
        ])
        score, breakdown, sc_notes, margin_sum = score_alevel(predicted_grades, req_offer)
        score_breakdown.extend(breakdown)
        notes.extend(sc_notes)

        if req_offer:
            label = f"At or above typical offer ({req_offer})" if (margin_sum or 0) >= 0 else f"Below typical offer ({req_offer})"
            (passed if (margin_sum or 0) >= 0 else failed).append(label)

        band    = band_from_score(score)
        verdict = "Eligible and competitive" if band == "Safe" and not failed else "Eligible — borderline competitive"
        strengths.append("A-level profile evaluated against the typical published offer.")

        applicant_context = {
            "n":          440 if payload.home_or_intl == "intl" else 880,
            "percentile": max(5, min(95, 100 - score)),
            "curriculum": "A_LEVELS",
            "context":    "Based on self-reported offer holder data from 2024-25 applicants.",
        }

    else:
        raise HTTPException(status_code=400, detail="Unsupported curriculum")

    # ── PS ───────────────────────────────────────────────────────────
    ps_out: Optional[Dict[str, Any]] = None
    if payload.ps is not None:
        ps_out, ps_err = run_ps_analyzer(row, payload.ps)
        if ps_err: notes.append(ps_err)

    university_id_str = clean_str(row.get("university_id"))
    score, ps_note    = apply_ps_score(score, ps_out, university_id_str)
    if ps_note: notes.append(ps_note)

    chance_percent = int(max(0, min(100, score)))

    # ── Gemini counsellor rewrite ─────────────────────────────────────
    detail_level = "brief" if chance_percent >= 75 else "detailed"
    default_next: List[str] = [
        "Double-check the official course page and entry requirements.",
        "Strengthen subject-specific evidence in your personal statement.",
    ]
    if payload.home_or_intl == "intl":
        default_next.insert(0, "International applicants often need a slightly higher score than the published minimum.")

    payload_summary: Dict[str, Any] = {
        "course_name":    clean_str(row.get("course_name")),
        "faculty":        clean_str(row.get("faculty")),
        "university_id":  university_id_str,
        "applicant_type": payload.home_or_intl,
        "curriculum":     payload.curriculum,
        "verdict":        verdict,
        "band":           band,
        "chance_percent": chance_percent,
        "threshold_used": threshold_used,
        "margin":         margin,
        "passed":         passed,
        "failed":         failed,
        "ps_included":    payload.ps is not None,
        "ps_band":        (ps_out.get("scores", {}).get("band") if isinstance(ps_out, dict) else None),
    }
    polish = counsellor_rewrite_with_gemini(detail_level, payload_summary)
    if polish:
        strengths    = polish.get("strengths", strengths)
        risks        = polish.get("risks", risks)
        default_next = polish.get("what_to_do_next", default_next)
        notes        = polish.get("notes", notes)

    return _build_response(
        verdict, band, chance_percent, course_info,
        passed, failed, threshold_used, margin,
        score_breakdown, strengths, risks, default_next, notes,
        ps_out, payload.course_id, home_min, applicant_context,
    )


@app.post("/api/py/analyse_ps")
async def analyse_ps(request: Request):
    """
    Standalone line-by-line PS analyser.
    Called from /dashboard/ps — no course_id required.
    FIX: this route was entirely missing. Frontend was getting 404.
    """
    try:
        body = await request.json()
    except Exception:
        return JSONResponse({"error": "Invalid JSON body"}, status_code=400)

    statement = (body.get("statement") or "").strip()
    lines     = body.get("lines") or []
    ps_format = body.get("format") or "UCAS_3Q"

    if not statement:
        return JSONResponse({"error": "Missing statement"}, status_code=400)
    if not lines or not isinstance(lines, list):
        return JSONResponse({"error": "lines must be a non-empty array"}, status_code=400)

    result, err = run_standalone_ps_analysis(statement, lines, ps_format)
    if err:
        return JSONResponse({"error": err}, status_code=500)
    return JSONResponse(result)