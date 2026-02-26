"use client";
import { useState } from "react";
import Link from "next/link";
import type { Profile, PSAnalysisResponse } from "@/lib/types";
import { savePSAnalysis } from "@/lib/profile";

// ── Constants ────────────────────────────────────────────────
const Q_LIMIT   = 1000;  // UCAS 2025 per-question character limit
const LEG_LIMIT = 4000;  // Legacy single-statement character limit

// ── Helpers ──────────────────────────────────────────────────
function splitLines(text: string): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const chunks: string[] = [];
  let cur = "";
  sentences.forEach((s, i) => {
    cur += s.trim() + " ";
    if ((i + 1) % 2 === 0 || i === sentences.length - 1) {
      const t = cur.trim();
      if (t.length > 10) chunks.push(t);
      cur = "";
    }
  });
  // Always return at least one chunk so the backend never receives lines: []
  return chunks.length > 0 ? chunks : [text.trim()];
}

// ── Verdict styling map ──────────────────────────────────────
const VS: Record<string, { bg: string; color: string; border: string; label: string }> = {
  strong:  { bg: "var(--safe-bg)", color: "var(--safe-t)", border: "var(--safe-b)", label: "Strong" },
  weak:    { bg: "var(--rch-bg)",  color: "var(--rch-t)",  border: "var(--rch-b)",  label: "Weak" },
  improve: { bg: "var(--tgt-bg)",  color: "var(--tgt-t)",  border: "var(--tgt-b)",  label: "Improve" },
  neutral: { bg: "var(--s3)",      color: "var(--t3)",      border: "var(--b)",       label: "Neutral" },
};

function ScoreDots({ score }: { score: number }) {
  const c = score >= 8 ? "var(--safe-t)" : score >= 5 ? "var(--tgt-t)" : "var(--rch-t)";
  return (
    <div style={{ display: "flex", gap: "3px", flexShrink: 0 }}>
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} style={{ width: "5px", height: "5px", borderRadius: "50%", background: i < score ? c : "var(--s3)" }} />
      ))}
    </div>
  );
}

function CharBar({ value, limit }: { value: number; limit: number }) {
  const pct = Math.min(100, (value / limit) * 100);
  const over = value > limit;
  const near = pct > 85;
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

const UCAS_QUESTIONS = [
  {
    key: "q1" as const,
    label: "Q1 — Why this subject?",
    desc: "Why do you want to study this course or subject?",
  },
  {
    key: "q2" as const,
    label: "Q2 — Academic preparation",
    desc: "How have your qualifications and studies prepared you for this course?",
  },
  {
    key: "q3" as const,
    label: "Q3 — Beyond the classroom",
    desc: "What else have you done to prepare outside your studies, and why does it interest you?",
  },
];

// ── Main component ────────────────────────────────────────────
export function PSAnalyserClient({ profile }: { profile: Profile }) {
  const savedFormat = (profile.ps_format as "UCAS_3Q" | "LEGACY") || "UCAS_3Q";
  const [format, setFormat] = useState<"UCAS_3Q" | "LEGACY">(savedFormat);

  const [q1, setQ1] = useState(profile.ps_q1 || "");
  const [q2, setQ2] = useState(profile.ps_q2 || "");
  const [q3, setQ3] = useState(profile.ps_q3 || "");
  const [statement, setStatement] = useState(profile.ps_statement || "");

  const [loading, setLoading]       = useState(false);
  const [err, setErr]               = useState("");
  const [activeIdx, setActiveIdx]   = useState<number | null>(null);
  const [analysis, setAnalysis]     = useState<PSAnalysisResponse | null>(
    profile.ps_last_analysis ?? null
  );

  const isUCAS = format === "UCAS_3Q";
  const qMap   = { q1, q2, q3 } as Record<"q1" | "q2" | "q3", string>;
  const setMap = { q1: setQ1, q2: setQ2, q3: setQ3 } as Record<"q1" | "q2" | "q3", (v: string) => void>;

  const combinedText = isUCAS
    ? [q1, q2, q3].filter(Boolean).join("\n\n")
    : statement;

  const wordCount = combinedText.trim() ? combinedText.trim().split(/\s+/).length : 0;

  // ── Analyse ───────────────────────────────────────────────
  async function analyse() {
    const text = combinedText.trim();
    if (!text) { setErr("Please write your personal statement first."); return; }
    setErr(""); setLoading(true); setAnalysis(null); setActiveIdx(null);
    try {
      const lines = splitLines(text);
      const res = await fetch("/api/py/analyse_ps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statement: text, lines, format }),
      });
      if (!res.ok) throw new Error(`Analysis failed (${res.status})`);
      const result: PSAnalysisResponse = await res.json();
      setAnalysis(result);
      savePSAnalysis(result).catch(() => {});
    } catch (e: any) {
      setErr(e.message || "Analysis failed");
    } finally {
      setLoading(false);
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

  const scoreColor = analysis
    ? analysis.overallScore >= 75 ? "var(--safe-t)"
    : analysis.overallScore >= 50 ? "var(--tgt-t)"
    : "var(--rch-t)"
    : "var(--t)";

  const hasPS = isUCAS ? !!(q1 || q2 || q3) : !!statement;

  return (
    <div style={{ padding: "48px 52px", maxWidth: "1020px" }}>

      {/* ── Header ───────────────────────────────────────── */}
      <div style={{ marginBottom: "32px" }}>
        <p className="label" style={{ marginBottom: "10px" }}>Academic writing</p>
        <h1 className="serif" style={{ fontSize: "44px", fontWeight: 400, color: "var(--t)", marginBottom: "10px", letterSpacing: "-0.02em" }}>
          PS Analyser
        </h1>
        <p style={{ fontSize: "14px", color: "var(--t3)", lineHeight: 1.65, maxWidth: "520px" }}>
          Line-by-line AI feedback on your personal statement. Scores each passage, flags clich&eacute;s, and suggests specific rewrites.
        </p>
      </div>

      {/* ── Format toggle ─────────────────────────────────── */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "24px" }}>
        <button onClick={() => { setFormat("UCAS_3Q"); setAnalysis(null); }} style={togStyle(isUCAS)}>
          UCAS 3 questions
          <span style={{ fontSize: "10px", color: "var(--t3)", marginLeft: "6px", padding: "1px 5px", background: "var(--s3)", borderRadius: "4px" }}>2025</span>
        </button>
        <button onClick={() => { setFormat("LEGACY"); setAnalysis(null); }} style={togStyle(!isUCAS)}>
          Single statement
        </button>
      </div>

      {/* ── Main grid ─────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: analysis ? "1fr 1fr" : "1fr", gap: "24px", alignItems: "start" }}>

        {/* ── Left: editor ─────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>

          {/* UCAS 3Q inputs */}
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
                      onBlur={e => (e.currentTarget.style.borderColor = "var(--b)")}
                    />
                    <div style={{ marginTop: "10px" }}>
                      <CharBar value={val.length} limit={Q_LIMIT} />
                    </div>
                  </div>
                );
              })}

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 4px" }}>
                <span style={{ fontSize: "12px", color: "var(--t3)" }}>{wordCount} words total</span>
                <span style={{ fontSize: "12px", color: (q1 + q2 + q3).length > Q_LIMIT * 3 ? "var(--rch-t)" : "var(--t3)" }}>
                  {(q1 + q2 + q3).length.toLocaleString()} / {(Q_LIMIT * 3).toLocaleString()} chars combined
                </span>
              </div>
            </>
          ) : (
            /* Legacy single textarea */
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
                rows={analysis ? 18 : 14}
                style={taStyle}
                onFocus={e => (e.currentTarget.style.borderColor = "var(--b-strong)")}
                onBlur={e => (e.currentTarget.style.borderColor = "var(--b)")}
              />
              <div style={{ marginTop: "10px" }}>
                <CharBar value={statement.length} limit={LEG_LIMIT} />
              </div>
            </div>
          )}

          {/* Error banner */}
          {err && (
            <div style={{ padding: "12px 14px", background: "var(--rch-bg)", border: "1px solid var(--rch-b)", borderRadius: "10px" }}>
              <p style={{ fontSize: "13px", color: "var(--rch-t)", margin: 0 }}>{err}</p>
            </div>
          )}

          {/* Analyse button */}
          <button
            onClick={analyse}
            disabled={loading || !combinedText.trim()}
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

          {/* Profile hint */}
          {!analysis && (
            <p style={{ fontSize: "12px", color: "var(--t3)", textAlign: "center", margin: 0 }}>
              {hasPS
                ? <>Pre-loaded from your profile. <Link href="/dashboard/profile" style={{ color: "var(--acc)", textDecoration: "none" }}>Edit in profile &rarr;</Link></>
                : <>No PS saved yet. <Link href="/dashboard/profile" style={{ color: "var(--acc)", textDecoration: "none" }}>Add it in your profile &rarr;</Link></>
              }
            </p>
          )}

          {/* ── Overall score card ───────────────────────────── */}
          {analysis && (
            <div className="card" style={{ marginTop: "4px" }}>
              <p className="label" style={{ marginBottom: "14px" }}>Overall</p>

              <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginBottom: "12px" }}>
                <span className="serif" style={{ fontSize: "52px", fontWeight: 400, color: scoreColor, lineHeight: 1 }}>
                  {analysis.overallScore}
                </span>
                <span className="serif" style={{ fontSize: "20px", color: "var(--t3)" }}>/100</span>
                <span className="pill" style={{ background: "var(--s3)", color: "var(--t2)", border: "1px solid var(--b)", marginLeft: "8px" }}>
                  {analysis.band}
                </span>
              </div>

              <p style={{ fontSize: "13px", color: "var(--t3)", lineHeight: 1.7, marginBottom: "16px" }}>
                {analysis.summary}
              </p>

              <div style={{ padding: "12px 14px", background: "var(--tgt-bg)", border: "1px solid var(--tgt-b)", borderRadius: "8px", marginBottom: "16px" }}>
                <p style={{ fontSize: "11px", color: "var(--t3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>Top priority</p>
                <p style={{ fontSize: "13px", color: "var(--tgt-t)", lineHeight: 1.65, margin: 0 }}>{analysis.topPriority}</p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div>
                  <p style={{ fontSize: "11px", color: "var(--t3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>Strengths</p>
                  {analysis.strengths.map((s, i) => (
                    <p key={i} style={{ fontSize: "12px", color: "var(--safe-t)", marginBottom: "5px", lineHeight: 1.55 }}>&middot; {s}</p>
                  ))}
                </div>
                <div>
                  <p style={{ fontSize: "11px", color: "var(--t3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>Weaknesses</p>
                  {analysis.weaknesses.map((w, i) => (
                    <p key={i} style={{ fontSize: "12px", color: "var(--rch-t)", marginBottom: "5px", lineHeight: 1.55 }}>&middot; {w}</p>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Right: line-by-line feedback ──────────────────── */}
        {analysis && (
          <div>
            <p className="label" style={{ marginBottom: "14px" }}>Line-by-line feedback</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
              {analysis.lineFeedback.map((lf, idx) => {
                const vs = VS[lf.verdict] || VS.neutral;
                const isActive = activeIdx === idx;
                return (
                  <div
                    key={idx}
                    onClick={() => setActiveIdx(isActive ? null : idx)}
                    style={{
                      background: isActive ? "var(--s2)" : "var(--s1)",
                      border: `1px solid ${isActive ? vs.border : "var(--b)"}`,
                      borderRadius: "12px",
                      padding: "13px 14px",
                      cursor: "pointer",
                      transition: "all 150ms",
                    }}
                    onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.borderColor = "var(--b-strong)"; }}
                    onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.borderColor = "var(--b)"; }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "11px", color: "var(--t3)", minWidth: "18px" }}>
                          {String(idx + 1).padStart(2, "0")}
                        </span>
                        <span className="pill" style={{ background: vs.bg, color: vs.color, border: `1px solid ${vs.border}`, fontSize: "10px", padding: "2px 8px" }}>
                          {vs.label}
                        </span>
                      </div>
                      <ScoreDots score={lf.score} />
                    </div>

                    <p style={{ fontSize: "12px", color: "var(--t2)", lineHeight: 1.6, borderLeft: `2px solid ${vs.border}`, paddingLeft: "10px", fontStyle: "italic", marginBottom: isActive ? "12px" : 0 }}>
                      &ldquo;{lf.line.length > 110 ? lf.line.slice(0, 110) + "\u2026" : lf.line}&rdquo;
                    </p>

                    {isActive && (
                      <div style={{ borderTop: "1px solid var(--b)", paddingTop: "12px" }}>
                        <p style={{ fontSize: "13px", color: "var(--t3)", lineHeight: 1.7, marginBottom: lf.suggestion ? "12px" : 0 }}>
                          {lf.feedback}
                        </p>
                        {lf.suggestion && (
                          <div style={{ background: "var(--s3)", border: "1px solid var(--b-strong)", borderRadius: "8px", padding: "10px 12px" }}>
                            <p style={{ fontSize: "10px", color: "var(--t3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>Suggested rewrite</p>
                            <p style={{ fontSize: "12px", color: "var(--acc)", lineHeight: 1.65, fontStyle: "italic", margin: 0 }}>
                              {lf.suggestion}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: "16px", padding: "12px 14px", background: "var(--s1)", border: "1px solid var(--b)", borderRadius: "10px", textAlign: "center" }}>
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
