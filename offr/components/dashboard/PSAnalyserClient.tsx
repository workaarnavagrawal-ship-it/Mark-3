"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import type { Profile, PSLineFeedback, PSAnalysisResponse } from "@/lib/types";
import { savePSAnalysis } from "@/lib/profile";

function splitLines(text: string): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const chunks: string[] = [];
  let cur = "";
  sentences.forEach((s, i) => {
    cur += s.trim() + " ";
    if ((i+1) % 2 === 0 || i === sentences.length-1) {
      const t = cur.trim();
      if (t.length > 10) chunks.push(t);
      cur = "";
    }
  });
  return chunks;
}

const VS: Record<string, { bg: string; color: string; border: string; label: string }> = {
  strong:  { bg: "var(--safe-bg)",  color: "var(--safe-t)",  border: "var(--safe-b)",  label: "Strong" },
  weak:    { bg: "var(--rch-bg)",   color: "var(--rch-t)",   border: "var(--rch-b)",   label: "Weak" },
  improve: { bg: "var(--tgt-bg)",   color: "var(--tgt-t)",   border: "var(--tgt-b)",   label: "Improve" },
  neutral: { bg: "var(--s3)",       color: "var(--t3)",       border: "var(--b)",        label: "Neutral" },
};

function ScoreDots({ score }: { score: number }) {
  const c = score >= 8 ? "var(--safe-t)" : score >= 5 ? "var(--tgt-t)" : "var(--rch-t)";
  return (
    <div style={{ display: "flex", gap: "3px", flexShrink: 0 }}>
      {Array.from({length:10}).map((_,i) => (
        <div key={i} style={{ width: "5px", height: "5px", borderRadius: "50%", background: i < score ? c : "var(--s3)" }} />
      ))}
    </div>
  );
}

export function PSAnalyserClient({ profile }: { profile: Profile }) {
  const defaultPS = profile.ps_format === "LEGACY"
    ? (profile.ps_statement || "")
    : [profile.ps_q1, profile.ps_q2, profile.ps_q3].filter(Boolean).join("\n\n");

  const [ps, setPs] = useState(defaultPS);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<PSAnalysisResponse | null>(
    profile.ps_last_analysis ?? null
  );
  const [err, setErr] = useState("");
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [wordCount, setWordCount] = useState(0);

  useEffect(() => { setWordCount(ps.trim() ? ps.trim().split(/\s+/).length : 0); }, [ps]);

  async function analyse() {
    if (!ps.trim()) { setErr("Please paste your personal statement first."); return; }
    setErr(""); setLoading(true); setAnalysis(null); setActiveIdx(null);
    const lines = splitLines(ps);
    try {
      const res = await fetch("/api/py/analyse_ps", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ statement: ps, lines, format: profile.ps_format || "UCAS_3Q" }) });
      if (!res.ok) throw new Error(`Analysis failed (${res.status})`);
      const result: PSAnalysisResponse = await res.json();
      setAnalysis(result);
      savePSAnalysis(result).catch(() => {}); // persist silently, don't block UI
    } catch (e: any) { setErr(e.message || "Analysis failed"); }
    finally { setLoading(false); }
  }

  const overallColor = analysis ? (analysis.overallScore >= 75 ? "var(--safe-t)" : analysis.overallScore >= 50 ? "var(--tgt-t)" : "var(--rch-t)") : "var(--t)";

  return (
    <div style={{ padding: "48px 52px", maxWidth: "980px" }}>
      <div style={{ marginBottom: "36px" }}>
        <p className="label" style={{ marginBottom: "10px" }}>Academic writing</p>
        <h1 className="serif" style={{ fontSize: "44px", fontWeight: 400, color: "var(--t)", marginBottom: "10px", letterSpacing: "-0.02em" }}>PS Analyser</h1>
        <p style={{ fontSize: "14px", color: "var(--t3)", lineHeight: 1.65, maxWidth: "480px" }}>Line-by-line feedback on your personal statement. Scores each passage and suggests improvements.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: analysis ? "1fr 1fr" : "1fr", gap: "24px", alignItems: "start" }}>
        {/* Left: input + overall */}
        <div>
          <div className="card" style={{ marginBottom: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
              <p className="label" style={{ margin: 0 }}>Your personal statement</p>
              <span style={{ fontSize: "12px", color: wordCount > 650 ? "var(--rch-t)" : "var(--t3)" }}>{wordCount} words</span>
            </div>
            <textarea value={ps} onChange={e => setPs(e.target.value)} placeholder="Paste your personal statement here…" rows={analysis ? 18 : 14}
              style={{ width: "100%", background: "var(--s2)", border: "1px solid var(--b)", borderRadius: "10px", padding: "12px 14px", fontSize: "14px", color: "var(--t)", lineHeight: 1.75, fontFamily: "var(--font-dm, var(--sans))", outline: "none", resize: "vertical" }}
              onFocus={e => (e.target as HTMLElement).style.borderColor = "var(--b-strong)"}
              onBlur={e => (e.target as HTMLElement).style.borderColor = "var(--b)"} />
          </div>

          {err && <div style={{ marginBottom: "10px", padding: "12px 14px", background: "var(--rch-bg)", border: "1px solid var(--rch-b)", borderRadius: "10px" }}><p style={{ fontSize: "13px", color: "var(--rch-t)" }}>{err}</p></div>}

          <button onClick={analyse} disabled={loading || !ps.trim()} className="btn btn-prim" style={{ width: "100%", padding: "13px" }}>
            {loading ? <><span style={{ width: "16px", height: "16px", border: "1.5px solid rgba(26,24,21,0.3)", borderTopColor: "var(--t-inv)", borderRadius: "50%", display: "inline-block", animation: "spin 0.8s linear infinite" }} /> Analysing…</> : "Analyse my PS →"}
          </button>

          {!analysis && !ps && (
            <div style={{ marginTop: "16px", padding: "14px 16px", background: "var(--s1)", border: "1px solid var(--b)", borderRadius: "10px" }}>
              {(profile.ps_q1 || profile.ps_statement) ? (
                <p style={{ fontSize: "13px", color: "var(--t3)" }}>Your PS is pre-loaded from your profile. You can edit it above or <Link href="/dashboard/profile" style={{ color: "var(--acc)", textDecoration: "none" }}>update it in your profile</Link>.</p>
              ) : (
                <p style={{ fontSize: "13px", color: "var(--t3)" }}>No PS saved. <Link href="/dashboard/profile" style={{ color: "var(--acc)", textDecoration: "none" }}>Add your PS in profile</Link> to pre-load it here.</p>
              )}
            </div>
          )}

          {/* Overall */}
          {analysis && (
            <div className="card" style={{ marginTop: "10px" }}>
              <p className="label" style={{ marginBottom: "14px" }}>Overall score</p>
              <div style={{ display: "flex", alignItems: "baseline", gap: "6px", marginBottom: "8px" }}>
                <span className="serif" style={{ fontSize: "52px", fontWeight: 400, color: overallColor, lineHeight: 1 }}>{analysis.overallScore}</span>
                <span className="serif" style={{ fontSize: "20px", color: "var(--t3)" }}>/100</span>
                <span className="pill" style={{ background: "var(--s3)", color: "var(--t2)", border: "1px solid var(--b)", marginLeft: "8px" }}>{analysis.band}</span>
              </div>
              <p style={{ fontSize: "13px", color: "var(--t3)", lineHeight: 1.7, marginBottom: "16px" }}>{analysis.summary}</p>
              <div style={{ padding: "12px 14px", background: "var(--tgt-bg)", border: "1px solid var(--tgt-b)", borderRadius: "8px", marginBottom: "16px" }}>
                <p style={{ fontSize: "11px", color: "var(--t3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>Top priority</p>
                <p style={{ fontSize: "13px", color: "var(--tgt-t)", lineHeight: 1.65 }}>{analysis.topPriority}</p>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div>
                  <p style={{ fontSize: "11px", color: "var(--t3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "10px" }}>Strengths</p>
                  {analysis.strengths.map((s,i) => <p key={i} style={{ fontSize: "12px", color: "var(--safe-t)", marginBottom: "6px", lineHeight: 1.55 }}>· {s}</p>)}
                </div>
                <div>
                  <p style={{ fontSize: "11px", color: "var(--t3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "10px" }}>Weaknesses</p>
                  {analysis.weaknesses.map((w,i) => <p key={i} style={{ fontSize: "12px", color: "var(--rch-t)", marginBottom: "6px", lineHeight: 1.55 }}>· {w}</p>)}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: line-by-line */}
        {analysis && (
          <div>
            <p className="label" style={{ marginBottom: "14px" }}>Line-by-line feedback</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
              {analysis.lineFeedback.map((lf, idx) => {
                const vs = VS[lf.verdict] || VS.neutral;
                const isActive = activeIdx === idx;
                return (
                  <div key={idx} onClick={() => setActiveIdx(isActive ? null : idx)} style={{
                    background: isActive ? "var(--s2)" : "var(--s1)",
                    border: `1px solid ${isActive ? vs.border : "var(--b)"}`,
                    borderRadius: "12px", padding: "13px 14px", cursor: "pointer", transition: "all 150ms",
                  }}
                  onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.borderColor = "var(--b-strong)"; }}
                  onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.borderColor = "var(--b)"; }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "11px", color: "var(--t3)", minWidth: "18px" }}>{String(idx+1).padStart(2,"0")}</span>
                        <span className="pill" style={{ background: vs.bg, color: vs.color, border: `1px solid ${vs.border}`, fontSize: "10px", padding: "2px 8px" }}>{vs.label}</span>
                      </div>
                      <ScoreDots score={lf.score} />
                    </div>
                    <p style={{ fontSize: "12px", color: "var(--t2)", lineHeight: 1.6, borderLeft: `2px solid ${vs.border}`, paddingLeft: "10px", fontStyle: "italic", marginBottom: isActive ? "12px" : 0 }}>
                      &ldquo;{lf.line.length > 110 ? lf.line.slice(0,110)+"…" : lf.line}&rdquo;
                    </p>
                    {isActive && (
                      <div style={{ borderTop: "1px solid var(--b)", paddingTop: "12px" }}>
                        <p style={{ fontSize: "13px", color: "var(--t3)", lineHeight: 1.7, marginBottom: lf.suggestion ? "12px" : 0 }}>{lf.feedback}</p>
                        {lf.suggestion && (
                          <div style={{ background: "var(--s3)", border: "1px solid var(--b-strong)", borderRadius: "8px", padding: "10px 12px" }}>
                            <p style={{ fontSize: "10px", color: "var(--t3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>Suggested rewrite</p>
                            <p style={{ fontSize: "12px", color: "var(--acc)", lineHeight: 1.65, fontStyle: "italic" }}>{lf.suggestion}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
