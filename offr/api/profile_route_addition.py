"""
Profile suggestions endpoint addition.
Appended to api/index.py via script.
"""

PROFILE_SUGGESTIONS_ROUTE = '''

# ─────────────────────────────────────────────────────────────
# Profile suggestions — /api/py/profile_suggestions
# AI reviews profile completeness and returns specific,
# actionable improvement tips for each weak area.
# ─────────────────────────────────────────────────────────────

class ProfileSuggestionsRequest(BaseModel):
    curriculum: str
    year: str
    interests_count: int
    has_grades: bool
    has_ps: bool
    ps_length: int          # character count (0 if not set)
    ib_total: Optional[int] = None
    a_level_count: Optional[int] = None


def _profile_suggestions_fallback(req: ProfileSuggestionsRequest) -> Dict[str, Any]:
    suggestions: List[Dict[str, str]] = []
    if req.interests_count == 0:
        suggestions.append({
            "field": "interests",
            "why": "Interests drive Hidden Gems recommendations and Alternative course suggestions across the app.",
            "action": "Add up to 3 interests in the interests section.",
        })
    elif req.interests_count < 3:
        suggestions.append({
            "field": "interests",
            "why": "More interests produce more personalised course recommendations.",
            "action": f"Add {3 - req.interests_count} more interest(s) to maximise Hidden Gems results.",
        })
    if not req.has_grades:
        suggestions.append({
            "field": "grades",
            "why": "Predicted grades are the primary input to offer chance calculations (Safe/Target/Reach).",
            "action": "Add your predicted grades — assessments cannot score you without them.",
        })
    if not req.has_ps:
        suggestions.append({
            "field": "ps",
            "why": "Your personal statement affects PS fit scoring in assessments and unlocks line-by-line analysis.",
            "action": "Add a draft PS below — even rough notes help. Analyse it on the PS page.",
        })
    elif req.ps_length < 500:
        suggestions.append({
            "field": "ps",
            "why": "A short PS provides limited signal for analysis tools.",
            "action": f"Your PS is {req.ps_length} characters. Aim for 2,000+ for meaningful feedback.",
        })
    if not suggestions:
        suggestions.append({
            "field": "complete",
            "why": "Your profile is well-populated — all core fields are filled.",
            "action": "Keep grades and PS updated as they change; assessment accuracy depends on current data.",
        })
    return {"status": "ok", "suggestions": suggestions}


@app.post("/api/py/profile_suggestions")
async def profile_suggestions(payload: ProfileSuggestionsRequest):
    """
    Returns AI-generated profile improvement suggestions.
    Deterministic inputs explain what is missing and why it matters.
    Falls back to rule-based suggestions when Gemini is unavailable.
    """
    tid = uuid.uuid4().hex[:8]

    if not is_gemini_available():
        return _profile_suggestions_fallback(payload)

    gaps: List[str] = []
    if payload.interests_count == 0:
        gaps.append("No interests set")
    elif payload.interests_count < 3:
        gaps.append(f"Only {payload.interests_count} interest(s) set (max 3)")
    if not payload.has_grades:
        gaps.append("No predicted grades entered")
    if not payload.has_ps:
        gaps.append("No personal statement added")
    elif payload.ps_length < 500:
        gaps.append(f"PS is very short ({payload.ps_length} chars)")

    if not gaps:
        return _profile_suggestions_fallback(payload)

    score_ctx = ""
    if payload.curriculum == "IB" and payload.ib_total:
        score_ctx = f"Predicted IB total: {payload.ib_total}/45."
    elif payload.a_level_count:
        score_ctx = f"Has {payload.a_level_count} A-Level subject(s) entered."

    gaps_joined = "; ".join(gaps)
    prompt = (
        "You are advising a UK UCAS applicant on completing their profile in an admissions tool.\\n\\n"
        f"Profile: {payload.curriculum.replace('_', '-')}, Year {payload.year}. {score_ctx}\\n"
        f"Gaps: {gaps_joined}\\n\\n"
        "Field purposes in this tool:\\n"
        "- interests: drives Hidden Gems and Alternative course recommendations\\n"
        "- grades: primary input to offer chance calculations (Safe/Target/Reach)\\n"
        "- ps: affects PS fit score and unlocks line-by-line PS analysis\\n\\n"
        'Return ONLY valid JSON:\\n'
        '{"suggestions": [{"field": "<interests|grades|ps|complete>", "why": "<specific to tool, <= 25 words>", "action": "<concrete next step, <= 20 words>"}]}\\n\\n'
        "One object per gap (max 3). Be specific about this tool, not generic UCAS advice."
    )

    result, err, latency_ms = call_gemini_json(prompt, trace_id=tid)

    if err or result is None:
        return _profile_suggestions_fallback(payload)

    raw = result.get("suggestions") or []
    if not raw:
        return _profile_suggestions_fallback(payload)

    return {
        "status": "ok",
        "suggestions": raw,
        "provider_meta": {"latency_ms": latency_ms},
    }
'''
