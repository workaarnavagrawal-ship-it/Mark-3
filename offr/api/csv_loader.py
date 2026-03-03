"""
csv_loader.py — Offr master course data loader with dirty-row cleaning.

Handles two known Case C dirty rows:
  - UCL_UPDM_BSC_2026: course_name "Urban Planning, Design and Management BSc" (1-comma split)
  - CAM_HSPS_BA_2026:  course_name "Human, Social, and Political Sciences" (2-comma split)

Emits a data_quality_report at startup.
"""
from __future__ import annotations

import csv
import logging
import math
import re
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger("offr.csv_loader")

# ─────────────────────────────────────────────────────────────
# Constants
# ─────────────────────────────────────────────────────────────

DATA_DIR = Path(__file__).parent / "data"

UNIVERSITY_NAME_MAP: Dict[str, str] = {
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
    "EXE":  "University of Exeter",
}

# Degree tokens to strip when building course_group_key
_DEGREE_TOKENS = {
    "bsc", "ba", "beng", "meng", "ma", "llb", "mbbs", "mpharm", "msci",
    "basc", "mmath", "mchem", "bmus", "bfa", "bds", "vetmb",
    "mb bchir", "mb bch", "bm bch", "mbbch", "mcomp", "mphys",
    "mmathphil", "mphysphil", "mcompsci", "mcompphil", "mbiol",
    "ba/bsc", "ba/meng", "ba/msci", "ba/mmath", "ba/mphys",
    "ba/mcompsci", "ba/mbiol",
}

# Regex to strip trailing degree tokens from course names
_DEGREE_TOKEN_RE = re.compile(
    r"\s+(?:BSc|BA|BEng|MEng|MA|LLB|MBBS|MPharm|MSci|BASc|MMath|MChem|BMus|BFA|BDS|VetMB"
    r"|MB\s+BChir|MB\s+BCh|BM\s+BCh|MBBCh|MComp|MPhys|MMathPhil|MPhysPhil|MCompSci"
    r"|MCompPhil|MBiol|BA/BSc|BA/MEng|BA/MSci|BA/MMath|BA/MPhys|BA/MCompSci|BA/MBiol"
    r"|MBBS/BSc)\s*$",
    re.IGNORECASE,
)

# Manual overrides for course_group_key edge cases
_COURSE_GROUP_OVERRIDES: Dict[str, str] = {
    # Variations of PPE
    "philosophy-politics-economics": "philosophy-politics-economics",
    "philosophy-politics-and-economics": "philosophy-politics-economics",
    "ppe": "philosophy-politics-economics",
    # HSPS / Human Social Political Sciences
    "human-social-and-political-sciences": "human-social-and-political-sciences",
    "human-social-political-sciences": "human-social-and-political-sciences",
    "hsps": "human-social-and-political-sciences",
    # Medicine / BM BCh variants
    "medicine": "medicine",
    "medicine-a100": "medicine",
    # Computing variants
    "computing": "computing",
    "computer-science": "computer-science",
}

# ─────────────────────────────────────────────────────────────
# Data quality report (module-level, populated at load time)
# ─────────────────────────────────────────────────────────────

data_quality_report: Dict[str, Any] = {
    "total_rows_in_file": 0,
    "rows_loaded": 0,
    "fixed_case_c": 0,
    "fixed_case_a": 0,
    "fixed_case_b": 0,
    "dropped": 0,
    "dropped_course_ids": [],
    "fix_details": [],
}

# ─────────────────────────────────────────────────────────────
# Type helpers
# ─────────────────────────────────────────────────────────────

def _clean(x: Any) -> str:
    return ("" if x is None else str(x)).strip()


def _to_int(v: Any) -> Optional[int]:
    if v is None:
        return None
    s = str(v).strip()
    if not s:
        return None
    m = re.search(r"-?\d+", s.replace(",", ""))
    return int(m.group(0)) if m else None


def _to_money(v: Any) -> Optional[int]:
    if v is None:
        return None
    s = str(v).strip()
    if not s:
        return None
    m = re.search(r"(\d[\d,]{3,})", s)
    return int(m.group(1).replace(",", "")) if m else None


def _is_url(s: str) -> bool:
    return s.strip().startswith("http")


def _is_degree_token(s: str) -> bool:
    """Check if s is purely a degree token (e.g. 'BSc', 'BA', 'MEng')."""
    t = s.strip().lower()
    if t in _DEGREE_TOKENS:
        return True
    # Also match combined tokens like "BA/BSc"
    parts = re.split(r"[/\s]+", t)
    return all(p in _DEGREE_TOKENS for p in parts if p)


def _extract_trailing_degree(s: str) -> Tuple[str, str]:
    """
    Split 'Urban Planning, Design and Management BSc' into
    ('Urban Planning, Design and Management', 'BSc').
    Returns (cleaned_name, degree_token). degree_token may be empty.
    """
    m = _DEGREE_TOKEN_RE.search(s)
    if m:
        degree = m.group(0).strip()
        name = s[: m.start()].strip(" ,")
        return name, degree
    return s.strip(), ""


# ─────────────────────────────────────────────────────────────
# Dirty-row fixers
# ─────────────────────────────────────────────────────────────

def _fix_case_c_one_comma(row: Dict[str, str]) -> Dict[str, str]:
    """
    Fix UCL_UPDM_BSC_2026 style: 1 unquoted comma in course_name shifted
    all fields right by 1.

    Before:
      faculty   = "The Bartlett Faculty..."  (correct)
      course_name = "Urban Planning"         (partial)
      degree_type = "Design and Management BSc"  (rest of name + degree)
      course_url  = "BSc"                    (was degree_type)
      curriculum_supported = "https://..."   (was course_url)
      typical_offer = "A-Levels; IB..."      (was curriculum_supported)
      min_requirements = "A-Levels: ABB..."  (was typical_offer)
      rest from min_points_home onward: correct

    After: reconstruct all shifted fields.
    """
    r = dict(row)
    partial_name = _clean(r.get("course_name", ""))
    rest_and_degree = _clean(r.get("degree_type", ""))
    clean_name, degree = _extract_trailing_degree(rest_and_degree)
    # If no trailing degree found, try taking the last word
    if not degree:
        parts = rest_and_degree.rsplit(" ", 1)
        if len(parts) == 2 and _is_degree_token(parts[1]):
            clean_name, degree = parts[0].strip(), parts[1].strip()
        else:
            clean_name, degree = rest_and_degree, ""

    # Keep degree token in course_name to match CSV convention (e.g. "Economics BSc")
    base = f"{partial_name}, {clean_name}" if clean_name else partial_name
    r["course_name"] = f"{base} {degree}".strip() if degree else base
    r["degree_type"] = degree or _clean(r.get("course_url", ""))
    r["course_url"] = _clean(r.get("curriculum_supported", ""))
    r["curriculum_supported"] = _clean(r.get("typical_offer", ""))
    r["typical_offer"] = _clean(r.get("min_requirements", ""))
    # min_requirements stays the same (often repeats typical_offer)
    # min_points_home and beyond are already in the correct position
    return r


def _fix_case_c_two_comma(row: Dict[str, str]) -> Dict[str, str]:
    """
    Fix CAM_HSPS_BA_2026 style: 2 unquoted commas in course_name
    shifted all fields right by 2 AND the last 2 original fields were
    truncated/merged into recommended_subjects via " | " separators.

    Before (pandas-loaded columns):
      faculty     = "Human"
      course_name = "Social"
      degree_type = "and Political Sciences"
      course_url  = "HSPS BA"        (was original faculty or a label)
      curriculum_supported = "BA"    (was degree_type)
      typical_offer = "https://..."  (was course_url)
      min_requirements = "A-Levels; IB..." (was curriculum_supported)
      min_points_home = "40"         (correct int; original typical_offer shifted further)
      intl_buffer_points = "1"       (correct)
      required_subjects = "A-Levels: A*AA..." (was typical_offer text)
      recommended_subjects = "ps_signals_text | 25700 | notes_text"  (merged)
      ps_expected_signals = "None required."  (was required_subjects)
      estimated_annual_cost_international = 25700  (correct)
      notes = same merged string (duplicate)

    After: reconstruct all shifted fields.
    """
    r = dict(row)

    # Reconstruct course_name from 3 split pieces
    p1 = _clean(r.get("faculty", ""))
    p2 = _clean(r.get("course_name", ""))
    p3 = _clean(r.get("degree_type", ""))
    raw_name = f"{p1}, {p2}, {p3}".strip(", ")
    # Clean up any double commas
    raw_name = re.sub(r",\s*,", ",", raw_name)
    # Strip trailing degree token if embedded
    clean_name, _ = _extract_trailing_degree(raw_name)

    # degree_type is in curriculum_supported
    degree_type = _clean(r.get("curriculum_supported", ""))
    if not _is_degree_token(degree_type):
        # Fallback: try course_url field (which had "HSPS BA" — extract trailing token)
        cu = _clean(r.get("course_url", ""))
        _, dt = _extract_trailing_degree(cu)
        degree_type = dt if dt else degree_type

    # course_url is in typical_offer
    course_url = _clean(r.get("typical_offer", ""))

    # curriculum_supported is in min_requirements
    curriculum_supported = _clean(r.get("min_requirements", ""))

    # typical_offer is in required_subjects
    typical_offer = _clean(r.get("required_subjects", ""))

    # min_requirements = same as typical_offer (they repeat in the CSV)
    min_requirements = typical_offer

    # min_points_home: already correct (int) — preserved
    # intl_buffer_points: already correct — preserved

    # required_subjects is in ps_expected_signals
    required_subjects = _clean(r.get("ps_expected_signals", ""))

    # Extract ps_expected_signals, notes from merged recommended_subjects
    merged = _clean(r.get("recommended_subjects", ""))
    ps_expected_signals = ""
    notes = ""
    if "|" in merged:
        parts = [p.strip() for p in merged.split("|")]
        # parts[0] = ps_signals text, parts[-1] = notes, middle part(s) = cost fragments
        ps_expected_signals = parts[0] if parts else ""
        notes_parts = [p for p in parts[1:] if not re.match(r"^\d{4,6}$", p.strip())]
        notes = " ".join(notes_parts).strip()
    else:
        ps_expected_signals = merged

    # Set faculty to a sensible value (course_name for Cambridge HSPS)
    faculty = clean_name  # use course_name as faculty label

    r["faculty"] = faculty
    r["course_name"] = clean_name
    r["degree_type"] = degree_type
    r["course_url"] = course_url
    r["curriculum_supported"] = curriculum_supported
    r["typical_offer"] = typical_offer
    r["min_requirements"] = min_requirements
    # min_points_home: leave as-is (already in correct position)
    # intl_buffer_points: leave as-is
    r["required_subjects"] = required_subjects
    r["recommended_subjects"] = ""
    r["ps_expected_signals"] = ps_expected_signals
    # estimated_annual_cost_international: leave as-is (already correct)
    r["notes"] = notes if notes else _clean(r.get("notes", ""))

    return r


# ─────────────────────────────────────────────────────────────
# Detection + dispatch
# ─────────────────────────────────────────────────────────────

def _needs_case_c_fix(row: Dict[str, str]) -> Optional[str]:
    """
    Returns '1comma' or '2comma' if the row needs a Case C fix, else None.

    Detection logic:
    - degree_type is NOT a known degree token
    - course_url is NOT a URL
    Then:
      - if typical_offer looks like a URL → 2-comma shift
      - if curriculum_supported looks like a URL → 1-comma shift
    """
    degree_type = _clean(row.get("degree_type", ""))
    course_url = _clean(row.get("course_url", ""))
    typical_offer = _clean(row.get("typical_offer", ""))
    curriculum_supported = _clean(row.get("curriculum_supported", ""))

    if _is_degree_token(degree_type):
        return None
    if _is_url(course_url):
        return None

    if _is_url(typical_offer):
        return "2comma"
    if _is_url(curriculum_supported):
        return "1comma"
    return None


def _clean_row(row: Dict[str, str], course_id: str) -> Optional[Dict[str, str]]:
    """
    Apply cleaning to a single row dict.
    Returns cleaned row, or None if the row is unrecoverable.
    """
    fix_type = _needs_case_c_fix(row)
    if fix_type == "1comma":
        return _fix_case_c_one_comma(row)
    if fix_type == "2comma":
        return _fix_case_c_two_comma(row)
    return row


# ─────────────────────────────────────────────────────────────
# Main loader
# ─────────────────────────────────────────────────────────────

# Module-level cache
_OFFERINGS_CACHE: Optional[List[Dict[str, Any]]] = None


def _pick_data_path() -> Path:
    env = __import__("os").getenv("OFFR_DATA_FILE", "").strip()
    if env:
        p = Path(env)
        if p.is_file():
            return p
        p2 = DATA_DIR / env
        if p2.is_file():
            return p2
    preferred = DATA_DIR / "master_courses.csv"
    if preferred.is_file():
        return preferred
    csvs = sorted(DATA_DIR.glob("*.csv"), key=lambda p: p.stat().st_mtime, reverse=True)
    if not csvs:
        raise RuntimeError(f"No .csv file found in {DATA_DIR}")
    return csvs[0]


def load_offerings(force_reload: bool = False) -> List[Dict[str, Any]]:
    """
    Load, clean, and return all course offerings as a list of dicts.
    Results are cached after first load.
    """
    global _OFFERINGS_CACHE
    global data_quality_report
    if _OFFERINGS_CACHE is not None and not force_reload:
        return _OFFERINGS_CACHE

    path = _pick_data_path()
    logger.info(f"Loading course data from {path}")

    # Read raw with csv module to preserve exact field values
    with open(path, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        raw_rows = list(reader)

    total_in_file = len(raw_rows)

    # Drop rows with no course_id
    raw_rows = [r for r in raw_rows if _clean(r.get("course_id", ""))]

    # Drop Unnamed columns (artefacts from Excel saves)
    for row in raw_rows:
        for k in list(row.keys()):
            if k.startswith("Unnamed") or k.startswith("unnamed"):
                del row[k]

    loaded: List[Dict[str, Any]] = []
    dropped: List[str] = []
    fix_details: List[Dict[str, str]] = []
    fixed_c = 0

    for row in raw_rows:
        course_id = _clean(row.get("course_id", "unknown"))
        try:
            fix_type = _needs_case_c_fix(row)
            if fix_type:
                cleaned = _clean_row(row, course_id)
                if cleaned is None:
                    dropped.append(course_id)
                    logger.warning(f"Dropped unrecoverable row: {course_id}")
                    continue
                fixed_c += 1
                fix_details.append({
                    "course_id": course_id,
                    "fix_type": f"case_c_{fix_type}",
                    "original_course_name": _clean(row.get("course_name", "")),
                    "fixed_course_name": _clean(cleaned.get("course_name", "")),
                })
                logger.info(f"Fixed Case C ({fix_type}): {course_id} → '{cleaned.get('course_name')}'")
                row = cleaned

            offering = _normalise_offering(row)
            loaded.append(offering)

        except Exception as exc:
            logger.error(f"Error processing row {course_id}: {exc}", exc_info=True)
            dropped.append(course_id)

    data_quality_report.update({
        "total_rows_in_file": total_in_file,
        "rows_loaded": len(loaded),
        "fixed_case_c": fixed_c,
        "fixed_case_a": 0,
        "fixed_case_b": 0,
        "dropped": len(dropped),
        "dropped_course_ids": dropped,
        "fix_details": fix_details,
    })

    logger.info(
        f"CSV loaded: {len(loaded)} offerings, {fixed_c} fixed (Case C), "
        f"{len(dropped)} dropped. Source: {path.name}"
    )

    _OFFERINGS_CACHE = loaded
    return loaded


def _normalise_offering(row: Dict[str, str]) -> Dict[str, Any]:
    """Convert a raw CSV row dict into a typed Offering dict."""
    uni_id = _clean(row.get("university_id", ""))
    if not uni_id and "course_id" in row:
        cid = _clean(row["course_id"])
        uni_id = cid.split("_")[0] if "_" in cid else cid[:6]

    return {
        "course_id": _clean(row.get("course_id", "")),
        "university_id": uni_id,
        "university_name": UNIVERSITY_NAME_MAP.get(uni_id, uni_id),
        "faculty": _clean(row.get("faculty", "")),
        "course_name": _clean(row.get("course_name", "")),
        "degree_type": _clean(row.get("degree_type", "")),
        "course_url": _clean(row.get("course_url", "")),
        "curriculum_supported": _clean(row.get("curriculum_supported", "")),
        "typical_offer": _clean(row.get("typical_offer", "")),
        "min_requirements": _clean(row.get("min_requirements", "")),
        "min_points_home": _to_int(row.get("min_points_home")),
        "intl_buffer_points": _to_int(row.get("intl_buffer_points")),
        "required_subjects": _clean(row.get("required_subjects", "")),
        "recommended_subjects": _clean(row.get("recommended_subjects", "")),
        "ps_expected_signals": _clean(row.get("ps_expected_signals", "")),
        "estimated_annual_cost_international": _to_money(
            row.get("estimated_annual_cost_international")
        ),
        "notes": _clean(row.get("notes", "")),
    }


# ─────────────────────────────────────────────────────────────
# Course grouping
# ─────────────────────────────────────────────────────────────

def _slugify(s: str) -> str:
    s = s.lower()
    s = re.sub(r"[^a-z0-9\s]", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return re.sub(r"\s+", "-", s)


def _course_group_key(course_name: str) -> str:
    """
    Derive a stable slug for deduplication across universities.
    Strips trailing degree tokens, lowercases, slugifies.
    """
    name = _clean(course_name)
    # Strip trailing degree token
    stripped, _ = _extract_trailing_degree(name)
    slug = _slugify(stripped or name)
    # Apply manual overrides
    return _COURSE_GROUP_OVERRIDES.get(slug, slug)


def build_course_groups(offerings: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Aggregate offerings into deduped course groups (one per logical course).
    """
    groups: Dict[str, Dict[str, Any]] = {}

    for o in offerings:
        key = _course_group_key(o["course_name"])
        if not key:
            continue

        if key not in groups:
            groups[key] = {
                "course_group_key": key,
                "course_group_name": o["course_name"],  # first-seen display name
                "offerings_count": 0,
                "offerings_preview": [],  # top 3 uni names
                "uni_ids": set(),
                "representative_faculty": o.get("faculty", ""),
                "_offering_ids": [],
            }

        g = groups[key]
        g["offerings_count"] += 1
        g["_offering_ids"].append(o["course_id"])

        uni_id = o["university_id"]
        if uni_id not in g["uni_ids"] and len(g["offerings_preview"]) < 3:
            g["offerings_preview"].append(o["university_name"])
        g["uni_ids"].add(uni_id)

    # Convert sets to sorted lists for serialisation
    result = []
    for key, g in sorted(groups.items(), key=lambda x: x[1]["course_group_name"]):
        result.append(
            {
                "course_group_key": g["course_group_key"],
                "course_group_name": g["course_group_name"],
                "offerings_count": g["offerings_count"],
                "offerings_preview": g["offerings_preview"],
                "representative_faculty": g["representative_faculty"],
            }
        )
    return result


# ─────────────────────────────────────────────────────────────
# Convenience accessors
# ─────────────────────────────────────────────────────────────

def get_offering(course_id: str) -> Optional[Dict[str, Any]]:
    for o in load_offerings():
        if o["course_id"] == course_id:
            return o
    return None


def get_offerings_by_uni(uni_code: str) -> List[Dict[str, Any]]:
    return [o for o in load_offerings() if o["university_id"].upper() == uni_code.upper()]


def get_offerings_by_query(query: str, uni_code: Optional[str] = None) -> List[Dict[str, Any]]:
    q = query.lower()
    results = []
    for o in load_offerings():
        if uni_code and o["university_id"].upper() != uni_code.upper():
            continue
        if (
            q in o["course_name"].lower()
            or q in o["faculty"].lower()
            or q in o["university_name"].lower()
        ):
            results.append(o)
    return results


def get_offerings_for_group(course_group_key: str) -> List[Dict[str, Any]]:
    return [
        o for o in load_offerings()
        if _course_group_key(o["course_name"]) == course_group_key
    ]
