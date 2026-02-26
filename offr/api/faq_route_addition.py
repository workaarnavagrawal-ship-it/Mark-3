"""FAQ assistant endpoint addition for api/index.py."""

FAQ_ASSISTANT_ROUTE = '''

# ─────────────────────────────────────────────────────────────
# FAQ assistant — /api/py/ask_faq
# Conversational assistant for UCAS / offr questions.
# Uses Gemini with the offr FAQ as context.
# ─────────────────────────────────────────────────────────────

# Embed FAQ as context so the model understands offr's domain
OFFR_CONTEXT = """
offr is a UK UCAS admissions tool for Year 11-12 students applying to UK universities.

Key features:
- Offer Assessment: Calculates Safe/Target/Reach (chance %) by comparing student grades to real 2024-25 offer holder data from 14 UK universities.
- Safe >70%, Target 40-70%, Reach <40%.
- Personal Statement (PS) Analyser: Line-by-line feedback on UCAS PS. Supports UCAS 3-question format and legacy single text.
- Tracker: UCAS portfolio tracker. Students label choices (Firm/Insurance/Backup/Wildcard). AI suggests labels.
- Explore: Browse all unique courses with AI Hidden Gems based on interests.
- Strategy: Audits Safe/Target/Reach mix, PS strategy tips, AI course alternatives.
- Dashboard: AI-powered "where you stand" summary.
- Profile: Student grades, interests (max 3), personal statement stored for auto-fill.

Universities covered: Oxford, Cambridge, LSE, Imperial, UCL, Warwick, Edinburgh, Bristol, Durham, Bath, St Andrews, King\'s College London, Manchester, Exeter.

Curricula supported: IB Diploma (max 45 points) and A-Levels.

UCAS facts:
- UK students can apply to max 5 universities on one UCAS application.
- Personal statement is max 4,000 characters (new 3-question format from 2025 entry).
- Firm choice = your first choice; Insurance = safe backup.
- UCAS deadline: typically 15 January for most universities; 15 October for Oxford/Cambridge/medicine.
"""


class AskFAQRequest(BaseModel):
    question: str


def _ask_faq_fallback() -> Dict[str, Any]:
    return {
        "status": "ok",
        "answer": "AI assistant is not available right now. Please browse the FAQ above or check the UCAS website for detailed guidance.",
        "follow_up_questions": [],
        "_fallback": True,
    }


@app.post("/api/py/ask_faq")
async def ask_faq(payload: AskFAQRequest):
    """
    Conversational FAQ assistant. Answers UCAS and offr questions
    using Gemini with embedded context. Falls back gracefully.
    """
    tid = uuid.uuid4().hex[:8]

    question = (payload.question or "").strip()[:500]  # hard cap
    if not question:
        return {"status": "error", "message": "Question is required.", "retryable": False}, 400

    if not is_gemini_available():
        return _ask_faq_fallback()

    prompt = (
        f"You are a helpful UCAS admissions assistant for the offr tool.\\n\\n"
        f"Context about offr and UK admissions:\\n{OFFR_CONTEXT}\\n\\n"
        f"Student question: {question}\\n\\n"
        "Return ONLY valid JSON (no markdown, no code fences):\\n"
        \'{"answer": "<clear, honest, specific answer in 2-4 sentences>", "follow_up_questions": ["<related question 1>", "<related question 2>"]}\\'\\n\\n"
        "Rules:\\n"
        "- answer ≤ 80 words, factual, grounded in the context above\\n"
        "- follow_up_questions: 2 short questions the student might want to ask next\\n"
        "- If you don\'t know, say so honestly — don\'t invent statistics or policies\\n"
        "- Be friendly but concise"
    )

    result, err, latency_ms = call_gemini_json(prompt, trace_id=tid, temperature=0.3)

    if err or result is None:
        return _ask_faq_fallback()

    return {
        "status": "ok",
        "answer": result.get("answer") or "I could not generate an answer. Please try rephrasing your question.",
        "follow_up_questions": result.get("follow_up_questions") or [],
        "provider_meta": {"latency_ms": latency_ms},
    }
'''
