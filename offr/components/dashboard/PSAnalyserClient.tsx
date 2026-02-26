"use client";
import { useState } from "react";
import Link from "next/link";
import type { Profile, PSEvaluateSuccess, PSEvaluateError } from "@/lib/types";
import { psEvaluate } from "@/lib/api";

// ── Constants ────────────────────────────────────────────────
const Q_LIMIT   = 1000;  // UCAS 2025 per-question character limit
const LEG_LIMIT = 4000;  // Legacy single-statement character limit
const PS_MIN    = 300;   // Minimum chars before we allow submission

// ── Helpers ──────────────────────────────────────────────────
function CharBar({ value, limit }: { value: number; limit: number }) {
  const pct   = Math.min(100, (value / limit) * 100);
  const over  = value > limit;
  const near  = pct > 85;
  const color = over ? "var(--rch-t)" : near ? "var(--tgt-t)" : "var(--acc)";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <div style={{ flex: 1, height: "3px", background: "var(--s3)", borderRadius: "2px", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, transition: "width 200ms, background 200ms" }} />
      </div>
      <span style={{ fontSize: "11px", color: over ? "var(--rch-t)" : "var(--t3)", minWidth: "64px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
        {value.toLocaleString()} / {limit.toLocaleString()}
      </span>
    </div>
  );
}

const BAND_COLOR: Record<string, string> = {
  EXCEPTIONAL: "var(--safe-t)",
  STRONG:      "var(--safe-t)",
  OK:          "var(--tgt-t)",
  WEAK:        "var(--rch-t)",
};

const WEIGHT_LABEL: Record<string, string> = {
  PS_HEAVY: "PS-heavy university — reads every word carefully",
  PS_MED:   "PS matters alongside your grades here",
  PS_LIGHT: "Grades-primary — PS reviewed but limited impact",
  UNKNOWN:  "University tier unknown",
};

const UCAS_QUESTIONS = [
  { key: "q1" as const, label: "Q1 — Why this subject?",      desc: "Why do you want to study this course or subject?" },
  { key: "q2" as const, label: "Q2 — Academic preparation",   desc: "How have your qualifications and studies prepared you for this course?" },
  { key: "q3" as const, label: "Q3 — Beyond the classroom",   desc: "What else have you done to prepare outside your studies, and why does it interest you?" },
];

function RubricBar({ label, score }: { label: string; score: number }) {
  const pct   = (score / 20) * 100;
  const color = score >= 15 ? "var(--safe-t)" : score >= 10 ? "var(--tgt-t)" : "var(--rch-t)";
  return (
    <div style={{ marginBottom: "10px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
        <span style={{ fontSize: "12px", color: "var(--t2)" }}>{label}</span>
        <span style={{ fontSize: "12px", color, fontVariantNumeric: "tabular-nums" }}>{score}/20</span>
      </div>
      <div style={{ height: "4px", background: "var(--s3)", borderRadius: "3px", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, transition: "width 300ms" }} />
      </div>
    </div>
  );
}

const RUBRIC_LABELS: Record<string, string> = {
  course_fit:               "Course fit",
  specificity_and_evidence: "Specificity & evidence",
  structure_and_coherence:  "Structure & coherence",
  voice_and_authenticity:   "Voice & authenticity",
  reflection_and_growth:    "Reflection & growth",
};

// ── Main component ────────────────────────────────────────────
export function PSAnalyserClient({ profile }: { profile: Profile }) {
  const savedFormat = (profile.ps_format as "UCAS_3Q" | "LEGACY") || "UCAS_3Q";
  const [format, setFormat] = useState<"UCAS_3Q" | "LEGACY">(savedFormat);

  const [q1, setQ1] = useState(profile.ps_q1 || "");
  const [q2, setQ2] = useState(profile.ps_q2 || "");
  const [q3, setQ3] = useState(profile.ps_q3 || "");
  const [statement, setStatement] = useState(profile.ps_statement || "");

  const [targetCourse, setTargetCourse]       = useState("");
  const [targetUniversity, setTargetUniversity] = useState("");

  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState<PSEvaluateSuccess | null>(null);
  const [apiError, setApiError] = useState<PSEvaluateError | null>(null);

  const isUCAS = format === "UCAS_3Q";
  const qMap   = { q1, q2, q3 } as Record<"q1"|"q2"|"q3", string>;
  const setMap = { q1: setQ1, q2: setQ2, q3: setQ3 } as Record<"q1"|"q2"|"q3", (v: string) => void>;

  const combinedText = isUCAS ? [q1, q2, q3].filter(Boolean).join("\n\n") : statement;
  const wordCount    = combinedText.trim() ? combinedText.trim().split(/\s+/).length : 0;
  const charCount    = combinedText.length;
  const hasPS        = isUCAS ? !!(q1 || q2 || q3) : !!statement;
  const canSubmit    = hasPS && charCount >= PS_MIN && targetCourse.trim().length > 0 && !loading;

  // ── Analyse ───────────────────────────────────────────────
  async function analyse() {
    if (!canSubmit) return;
    setApiError(null);
    setResult(null);
    setLoading(true);

    const resp = await psEvaluate({
      personal_statement_text: combinedText.trim(),
      target_course: targetCourse.trim(),
      target_university: targetUniversity.trim() || null,
      curriculum: (profile.curriculum as "IB" | "A_LEVELS") || null,
      grades_summary: null,
      mode: "standalone",
    });

    setLoading(false);

    if (resp.status === "error") {
      setApiError(resp);
    } else {
      setResult(resp);
    }
  }

  // ── Styles ────────────────────────────────────────────────
  const togStyle = (active: boolean): React.CSSProperties => ({
    padding: "7px 18px",
    borderRadius: "8px",
    border: `1px solid ${active ? "var(--b-strong)" : "var(--b)"}`,
    background: active ? "var(--s3)" : "transparent",
    color: active ? "var(--t)" : "var(--t3)",
    fontSize: "13px",
    cursor: "pointer",
    fontFamily: "inherit",
    transition: "all 120ms",
  });

  const taStyle: React.CSSProperties = {
    width: "100%",
    background: "var(--s2)",
    border: "1px solid var(--b)",
    borderRadius: "10px",
    padding: "12px 14px",
    fontSize: "14px",
    color: "var(--t)",
    lineHeight: 1.75,
    fontFamily: "var(--font-dm, var(--sans))",
    outline: "none",
    resize: "vertical",
    boxSizing: "border-box",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "var(--s2)",
    border: "1px solid var(--b)",
    borderRadius: "8px",
    padding: "9px 12px",
    fontSize: "13px",
    color: "var(--t)",
    fontFamily: "inherit",
    outline: "none",
    boxSizing: "border-box",
  };

  const scoreColor = result
    ? result.ps_band === "EXCEPTIONAL" || result.ps_band === "STRONG"
      ? "var(--safe-t)"
      : result.ps_band === "OK"
      ? "var(--tgt-t)"
      : "var(--rch-t)"
    : "var(--t)";

  return (
    <div style={{ padding: "48px 52px", maxWidth: "1100px" }}>

      {/* ── Header ───────────────────────────────────────── */}
      <div style={{ marginBottom: "32px" }}>
        <p className="label" style={{ marginBottom: "10px" }}>Academic writing</p>
        <h1 className="serif" style={{ fontSize: "44px", fontWeight: 400, color: "var(--t)", marginBottom: "10px", letterSpacing: "-0.02em" }}>
          PS Analyser
        </h1>
        <p style={{ fontSize: "14px", color: "var(--t3)", lineHeight: 1.65, maxWidth: "520px" }}>
          AI feedback on your personal statement, evaluated specifically for your target course.
        </p>
      </div>

      {/* ── Context inputs ────────────────────────────────── */}
      <div className="card" style={{ padding: "18px", marginBottom: "20px" }}>
        <p className="label" style={{ marginBottom: "12px" }}>Target course context</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div>
            <label style={{ fontSize: "11px", color: "var(--t3)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "5px" }}>
              Course <span style={{ color: "var(--rch-t)" }}>*</span>
            </label>
            <input
              type="text"
              value={targetCourse}
              onChange={e => setTargetCourse(e.target.value)}
              placeholder="e.g. Economics"
              style={inputStyle}
              onFocus={e => (e.currentTarget.style.borderColor = "var(--b-strong)")}
              onBlur={e  => (e.currentTarget.style.borderColor = "var(--b)")}
            />
          </div>
          <div>
            <label style={{ fontSize: "11px", color: "var(--t3)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "5px" }}>
              University <span style={{ color: "var(--t3)" }}>(optional)</span>
            </label>
            <input
              type="text"
              value={targetUniversity}
              onChange={e => setTargetUniversity(e.target.value)}
              placeholder="e.g. LSE, Oxford, Warwick…"
              style={inputStyle}
              onFocus={e => (e.currentTarget.style.borderColor = "var(--b-strong)")}
              onBlur={e  => (e.currentTarget.style.borderColor = "var(--b)")}
            />
          </div>
        </div>
        {!targetCourse.trim() && (
          <p style={{ fontSize: "11px", color: "var(--tgt-t)", marginTop: "8px", margin: "8px 0 0" }}>
            Enter a target course to enable analysis.
          </p>
        )}
      </div>

      {/* ── Format toggle ─────────────────────────────────── */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
        <button onClick={() => { setFormat("UCAS_3Q"); setResult(null); setApiError(null); }} style={togStyle(isUCAS)}>
          UCAS 3 questions
          <span style={{ fontSize: "10px", color: "var(--t3)", marginLeft: "6px", padding: "1px 5px", background: "var(--s3)", borderRadius: "4px" }}>2025</span>
        </button>
        <button onClick={() => { setFormat("LEGACY"); setResult(null); setApiError(null); }} style={togStyle(!isUCAS)}>
          Single statement
        </button>
      </div>

      {/* ── Main grid ─────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: result ? "1fr 1fr" : "1fr", gap: "24px", alignItems: "start" }}>

        {/* ── Left: editor ─────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>

          {isUCAS ? (
            <>
              {UCAS_QUESTIONS.map(({ key, label, desc }) => {
                const val = qMap[key];
                const set = setMap[key];
                return (
                  <div key={key} className="card" style={{ padding: "18px" }}>
                    <div style={{ marginBottom: "10px" }}>
                      <p className="label" style={{ margin: 0, marginBottom: "3px" }}>{label}</p>
                      <p style={{ fontSize: "12px", color: "var(--t3)", margin: 0, lineHeight: 1.5 }}>{desc}</p>
                    </div>
                    <textarea
                      value={val}
                      onChange={e => set(e.target.value)}
                      placeholder="Write your answer here…"
                      rows={5}
                      style={taStyle}
                      onFocus={e => (e.currentTarget.style.borderColor = "var(--b-strong)")}
                      onBlur={e  => (e.currentTarget.style.borderColor = "var(--b)")}
                    />
                    <div style={{ marginTop: "10px" }}>
                      <CharBar value={val.length} limit={Q_LIMIT} />
                    </div>
                  </div>
                );
              })}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 4px" }}>
                <span style={{ fontSize: "12px", color: "var(--t3)" }}>{wordCount} words total</span>
                <span style={{ fontSize: "12px", color: (q1+q2+q3).length > Q_LIMIT*3 ? "var(--rch-t)" : "var(--t3)" }}>
                  {(q1+q2+q3).length.toLocaleString()} / {(Q_LIMIT*3).toLocaleString()} chars combined
                </span>
              </div>
            </>
          ) : (
            <div className="card">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                <p className="label" style={{ margin: 0 }}>Your personal statement</p>
                <span style={{ fontSize: "12px", color: wordCount > 650 ? "var(--rch-t)" : "var(--t3)" }}>
                  {wordCount} words
                </span>
              </div>
              <textarea
                value={statement}
                onChange={e => setStatement(e.target.value)}
                placeholder="Paste your personal statement here…"
                rows={result ? 18 : 14}
                style={taStyle}
                onFocus={e => (e.currentTarget.style.borderColor = "var(--b-strong)")}
                onBlur={e  => (e.currentTarget.style.borderColor = "var(--b)")}
              />
              <div style={{ marginTop: "10px" }}>
                <CharBar value={statement.length} limit={LEG_LIMIT} />
              </div>
            </div>
          )}

          {/* ── Error banner ─────────────────────────────── */}
          {apiError && (
            <div style={{ padding: "14px 16px", background: "var(--rch-bg)", border: "1px solid var(--rch-b)", borderRadius: "10px" }}>
              <p style={{ fontSize: "13px", color: "var(--rch-t)", margin: 0, marginBottom: apiError.retryable ? "10px" : 0, fontWeight: 500 }}>
                {apiError.error_code === "VALIDATION_ERROR"
                  ? apiError.message
                  : apiError.error_code === "PROVIDER_RATE_LIMIT"
                  ? "AI is currently rate-limited. Please wait a moment and try again."
                  : apiError.error_code === "PROVIDER_TIMEOUT"
                  ? "AI took too long to respond. Please try again."
                  : apiError.message || "Analysis failed. Please try again."}
              </p>
              {apiError.retryable && (
                <button
                  onClick={analyse}
                  style={{ fontSize: "12px", color: "var(--rch-t)", background: "none", border: "1px solid var(--rch-b)", borderRadius: "6px", padding: "4px 10px", cursor: "pointer", fontFamily: "inherit" }}
                >
                  Retry
                </button>
              )}
            </div>
          )}

          {/* ── Short PS warning ─────────────────────────── */}
          {charCount > 0 && charCount < PS_MIN && (
            <p style={{ fontSize: "12px", color: "var(--tgt-t)", margin: "0 4px" }}>
              {charCount} / {PS_MIN} chars minimum — keep writing.
            </p>
          )}

          {/* ── Analyse button ───────────────────────────── */}
          <button
            onClick={analyse}
            disabled={!canSubmit}
            className="btn btn-prim"
            style={{ width: "100%", padding: "13px" }}
          >
            {loading ? (
              <>
                <span style={{
                  width: "16px", height: "16px",
                  border: "1.5px solid rgba(26,24,21,0.3)",
                  borderTopColor: "var(--t-inv)",
                  borderRadius: "50%", display: "inline-block",
                  animation: "spin 0.8s linear infinite",
                  marginRight: "8px",
                }} />
                Analysing&hellip;
              </>
            ) : "Analyse my PS \u2192"}
          </button>

          {!result && (
            <p style={{ fontSize: "12px", color: "var(--t3)", textAlign: "center", margin: 0 }}>
              {hasPS
                ? <>Pre-loaded from your profile. <Link href="/dashboard/profile" style={{ color: "var(--acc)", textDecoration: "none" }}>Edit in profile &rarr;</Link></>
                : <>No PS saved yet. <Link href="/dashboard/profile" style={{ color: "var(--acc)", textDecoration: "none" }}>Add it in your profile &rarr;</Link></>
              }
            </p>
          )}

          {/* ── Overall score card ───────────────────────── */}
          {result && (
            <div className="card" style={{ marginTop: "4px" }}>
              <p className="label" style={{ marginBottom: "14px" }}>Overall</p>

              <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginBottom: "12px" }}>
                <span className="serif" style={{ fontSize: "52px", fontWeight: 400, color: scoreColor, lineHeight: 1 }}>
                  {result.score}
                </span>
                <span className="serif" style={{ fontSize: "20px", color: "var(--t3)" }}>/100</span>
                <span className="pill" style={{ background: "var(--s3)", color: BAND_COLOR[result.ps_band] || "var(--t2)", border: "1px solid var(--b)", marginLeft: "8px" }}>
                  {result.ps_band}
                </span>
              </div>

              <p style={{ fontSize: "13px", color: "var(--t3)", lineHeight: 1.7, marginBottom: "16px" }}>
                {result.summary_reasoning}
              </p>

              {/* Impact on chances */}
              <div style={{ padding: "11px 13px", background: "var(--s3)", border: "1px solid var(--b)", borderRadius: "8px", marginBottom: "14px" }}>
                <p style={{ fontSize: "10px", color: "var(--t3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>
                  {WEIGHT_LABEL[result.impact_on_chances.weight_class] || "PS impact"}
                </p>
                <p style={{ fontSize: "12px", color: "var(--t2)", lineHeight: 1.55, margin: 0 }}>
                  {result.impact_on_chances.rationale}
                </p>
                {result.impact_on_chances.suggested_impact_points !== 0 && (
                  <p style={{ fontSize: "11px", color: result.impact_on_chances.suggested_impact_points > 0 ? "var(--safe-t)" : "var(--rch-t)", marginTop: "5px", margin: "5px 0 0" }}>
                    Estimated score impact: {result.impact_on_chances.suggested_impact_points > 0 ? "+" : ""}{result.impact_on_chances.suggested_impact_points} pts
                  </p>
                )}
              </div>

              {result.grade_compliment_note && (
                <div style={{ padding: "10px 13px", background: "var(--s2)", border: "1px solid var(--b)", borderRadius: "8px", marginBottom: "14px" }}>
                  <p style={{ fontSize: "12px", color: "var(--t3)", lineHeight: 1.55, margin: 0, fontStyle: "italic" }}>
                    {result.grade_compliment_note}
                  </p>
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div>
                  <p style={{ fontSize: "11px", color: "var(--t3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>Strengths</p>
                  {result.top_strengths.map((s, i) => (
                    <p key={i} style={{ fontSize: "12px", color: "var(--safe-t)", marginBottom: "5px", lineHeight: 1.55 }}>&middot; {s}</p>
                  ))}
                </div>
                <div>
                  <p style={{ fontSize: "11px", color: "var(--t3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>Improvements</p>
                  {result.top_improvements.map((w, i) => (
                    <p key={i} style={{ fontSize: "12px", color: "var(--rch-t)", marginBottom: "5px", lineHeight: 1.55 }}>&middot; {w}</p>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Right: rubric + line fixes ─────────────────── */}
        {result && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Rubric */}
            <div className="card" style={{ padding: "18px" }}>
              <p className="label" style={{ marginBottom: "16px" }}>Rubric breakdown</p>
              {Object.entries(result.rubric).map(([key, dim]) => (
                <div key={key}>
                  <RubricBar label={RUBRIC_LABELS[key] || key} score={dim.score} />
                  {dim.notes.length > 0 && (
                    <p style={{ fontSize: "11px", color: "var(--t3)", marginBottom: "10px", marginTop: "2px", lineHeight: 1.55, paddingLeft: "2px" }}>
                      {dim.notes[0]}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* Line-level fixes */}
            {result.line_level_fixes && result.line_level_fixes.length > 0 && (
              <div className="card" style={{ padding: "18px" }}>
                <p className="label" style={{ marginBottom: "12px" }}>Specific fixes</p>
                {result.line_level_fixes.map((fix, i) => (
                  <div key={i} style={{ padding: "10px 12px", background: "var(--s3)", borderRadius: "8px", marginBottom: "8px", borderLeft: "2px solid var(--tgt-b)" }}>
                    <p style={{ fontSize: "12px", color: "var(--t2)", lineHeight: 1.65, margin: 0 }}>{fix}</p>
                  </div>
                ))}
              </div>
            )}

            <div style={{ padding: "12px 14px", background: "var(--s1)", border: "1px solid var(--b)", borderRadius: "10px", textAlign: "center" }}>
              <p style={{ fontSize: "12px", color: "var(--t3)", margin: 0 }}>
                After editing, click &ldquo;Analyse my PS &rarr;&rdquo; again to refresh feedback.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
