# =====================================================================
# ADD THIS TO YOUR EXISTING api/index.py
# =====================================================================
# At the top, ensure these imports exist:
#   import json
#   from fastapi.responses import JSONResponse
#   from fastapi import Request
#
# Then add this route:
# =====================================================================

@app.post("/api/py/analyse_ps")
async def analyse_ps(request: Request):
    body = await request.json()
    statement = body.get("statement", "")
    lines = body.get("lines", [])
    ps_format = body.get("format", "UCAS_3Q")

    if not statement or not lines:
        return JSONResponse({"error": "Missing statement or lines"}, status_code=400)

    prompt = f"""You are a world-class UK university admissions consultant.
Analyse this {ps_format} personal statement and return ONLY valid JSON, no markdown, no fences.

Statement:
\"\"\"
{statement}
\"\"\"

Chunks to analyse ({len(lines)} total):
{json.dumps([{"index": i, "text": line} for i, line in enumerate(lines)], indent=2)}

Return exactly:
{{
  "overallScore": <integer 0-100>,
  "band": <"Exceptional"|"Strong"|"Solid"|"Developing"|"Weak">,
  "summary": "<2-3 sentence honest overall assessment>",
  "strengths": ["<3 specific strengths>"],
  "weaknesses": ["<3 specific weaknesses>"],
  "topPriority": "<single most important thing to fix>",
  "lineFeedback": [
    {{
      "lineNumber": <index 0-based>,
      "line": "<exact chunk text>",
      "score": <1-10>,
      "verdict": <"strong"|"weak"|"improve"|"neutral">,
      "feedback": "<1-2 sentence honest critique>",
      "suggestion": "<improved rewrite or null>"
    }}
  ]
}}

Be specific and honest. Admissions tutors at Oxford, LSE, UCL reward: intellectual curiosity, specific examples over vague claims, subject-specific depth, authentic voice."""

    try:
        import google.generativeai as genai
        import os
        genai.configure(api_key=os.environ.get("GEMINI_API_KEY", ""))
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content(prompt)
        text = response.text.strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[1] if "\n" in text else text
            text = text.rsplit("```", 1)[0]
        if text.startswith("json"):
            text = text[4:].strip()
        return JSONResponse(json.loads(text))
    except json.JSONDecodeError as e:
        return JSONResponse({"error": f"Failed to parse AI response: {str(e)}"}, status_code=500)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)
