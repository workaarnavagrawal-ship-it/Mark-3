"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { updateTrackerLabel, deleteTrackerEntry } from "@/lib/profile";
import { postPortfolioAdvice, postLabelSuggestions } from "@/lib/api";
import { AIBlock } from "@/components/ai/AIBlock";
import type {
  AIStatus,
  LabelSuggestion,
  PortfolioAdviceResponse,
  TrackerEntry,
} from "@/lib/types";

const LABELS = ["Firm", "Insurance", "Backup", "Wildcard", "Undecided"];
const BS: Record<string, any> = {
  Safe:   { bg: "var(--safe-bg)", color: "var(--safe-t)", border: "1px solid var(--safe-b)", bar: "var(--safe-t)" },
  Target: { bg: "var(--tgt-bg)",  color: "var(--tgt-t)",  border: "1px solid var(--tgt-b)", bar: "var(--tgt-t)" },
  Reach:  { bg: "var(--rch-bg)",  color: "var(--rch-t)",  border: "1px solid var(--rch-b)", bar: "var(--rch-t)" },
};

export function TrackerClient({ initialAssessments, curriculum = "IB", interests = [] }: {
  initialAssessments: TrackerEntry[];
  curriculum?: string;
  interests?: string[];
}) {
  const [entries, setEntries] = useState(initialAssessments);
  const [labelOpen, setLabelOpen] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  // ── Portfolio advice (AI) ─────────────────────────────────────
  const [portfolioAdvice, setPortfolioAdvice]   = useState<PortfolioAdviceResponse | null>(null);
  const [portfolioStatus, setPortfolioStatus]   = useState<AIStatus>("idle");
  const [portfolioErr,    setPortfolioErr]      = useState<string | null>(null);

  // ── Label suggestions (AI) ────────────────────────────────────
  const [labelSuggestions, setLabelSuggestions] = useState<Record<string, LabelSuggestion>>({});
  const [labelAIStatus,    setLabelAIStatus]    = useState<AIStatus>("idle");

  const fetchAI = useCallback(async (currentEntries: TrackerEntry[]) => {
    if (!currentEntries.length) return;

    const bands: Record<string, number> = { Safe: 0, Target: 0, Reach: 0 };
    currentEntries.forEach(e => { if (e.band in bands) bands[e.band]++; });

    // Portfolio advice + label suggestions in parallel
    setPortfolioStatus("loading");
    setLabelAIStatus("loading");

    const [adviceRes, labelRes] = await Promise.allSettled([
      postPortfolioAdvice({
        curriculum,
        interests,
        bands,
        assessments: currentEntries.map(e => ({
          course_name: e.course_name,
          university_name: e.university_name,
          band: e.band,
          chance_percent: e.chance_percent,
        })),
      }),
      postLabelSuggestions({
        entries: currentEntries.map(e => ({
          course_name: e.course_name,
          university_name: e.university_name,
          band: e.band,
          chance_percent: e.chance_percent,
        })),
      }),
    ]);

    if (adviceRes.status === "fulfilled") {
      setPortfolioAdvice(adviceRes.value);
      setPortfolioStatus("ok");
    } else {
      setPortfolioErr((adviceRes.reason as Error)?.message ?? "Could not load portfolio advice.");
      setPortfolioStatus("error");
    }

    if (labelRes.status === "fulfilled") {
      setLabelSuggestions(labelRes.value.suggestions ?? {});
      setLabelAIStatus("ok");
    } else {
      setLabelAIStatus("error");
    }
  }, [curriculum, interests]);

  useEffect(() => {
    if (initialAssessments.length > 0) fetchAI(initialAssessments);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLabel(id: string, label: string) {
    await updateTrackerLabel(id, label);
    setEntries(p => p.map(e => e.id === id ? { ...e, label } : e));
    setLabelOpen(null);
    setSavedId(id);
    setTimeout(() => setSavedId(null), 2000);
  }

  async function handleDelete(id: string) {
    await deleteTrackerEntry(id);
    const next = entries.filter(e => e.id !== id);
    setEntries(next);
    if (next.length > 0) fetchAI(next);
  }

  const counts = { Safe: 0, Target: 0, Reach: 0 };
  entries.forEach(e => { if (e.band in counts) counts[e.band as keyof typeof counts]++; });

  return (
    <div style={{ padding: "48px 52px", maxWidth: "800px" }}>
      <div style={{ marginBottom: "40px" }}>
        <p className="label" style={{ marginBottom: "10px" }}>UCAS planning</p>
        <h1 className="serif" style={{ fontSize: "44px", fontWeight: 400, color: "var(--t)", marginBottom: "10px", letterSpacing: "-0.02em" }}>Offer Tracker</h1>
        <p style={{ fontSize: "14px", color: "var(--t3)", lineHeight: 1.65 }}>Your shortlist. Label, review, and refine your 5 UCAS choices.</p>
      </div>

      {entries.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", marginBottom: "24px" }}>
          {(["Safe","Target","Reach"] as const).map(band => {
            const bs = BS[band];
            return (
              <div key={band} style={{ padding: "20px", background: bs.bg, border: `1px solid ${bs.border.replace("1px solid ","")}`, borderRadius: "var(--r)" }}>
                <p className="serif" style={{ fontSize: "40px", fontWeight: 400, color: bs.color, lineHeight: 1, marginBottom: "4px" }}>{counts[band]}</p>
                <p style={{ fontSize: "11px", color: bs.color, opacity: 0.7, textTransform: "uppercase", letterSpacing: "0.06em" }}>{band} choice{counts[band] !== 1 ? "s" : ""}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* AI portfolio advice block */}
      {entries.length > 0 && (
        <div className="card" style={{ marginBottom: "16px" }}>
          <p className="label" style={{ marginBottom: "10px" }}>AI portfolio assessment</p>
          <AIBlock
            status={portfolioStatus}
            error={portfolioErr ?? undefined}
            onRetry={() => fetchAI(entries)}
            skeletonLines={2}
          >
            {portfolioAdvice && (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
                  <p style={{ fontSize: "13px", color: "var(--t2)", lineHeight: 1.65, flex: 1 }}>
                    {portfolioAdvice.strategy_summary}
                  </p>
                  <span style={{
                    fontSize: "11px", color: "var(--t3)", textTransform: "uppercase",
                    letterSpacing: "0.05em", flexShrink: 0, marginTop: "2px",
                    padding: "3px 8px", border: "1px solid var(--b)", borderRadius: "6px",
                  }}>
                    {portfolioAdvice.risk_balance}
                  </span>
                </div>
                {portfolioAdvice.actions.map((action, i) => (
                  <div key={i} style={{ display: "flex", gap: "10px" }}>
                    <span style={{ color: "var(--acc)", flexShrink: 0 }}>→</span>
                    <p style={{ fontSize: "12px", color: "var(--t3)", lineHeight: 1.6 }}>{action}</p>
                  </div>
                ))}
              </div>
            )}
          </AIBlock>
        </div>
      )}

      {entries.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "56px 32px", borderStyle: "dashed" }}>
          <h3 className="serif" style={{ fontSize: "22px", fontWeight: 400, color: "var(--t)", marginBottom: "10px" }}>No choices saved yet</h3>
          <p style={{ fontSize: "13px", color: "var(--t3)", marginBottom: "24px", lineHeight: 1.65 }}>Run an assessment and it&apos;ll appear here automatically.</p>
          <Link href="/dashboard/assess" className="btn btn-prim">Check offer chances →</Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {entries.map(entry => {
            const bs = BS[entry.band] || BS.Reach;
            const isLabelOpen = labelOpen === entry.id;
            return (
              <div key={entry.id} className="card" style={{ padding: "18px 22px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
                      <h3 className="serif" style={{ fontSize: "18px", fontWeight: 400, color: "var(--t)" }}>{entry.course_name}</h3>
                      <span className="pill" style={{ background: bs.bg, color: bs.color, border: bs.border }}>{entry.band}</span>
                    </div>
                    <p style={{ fontSize: "12px", color: "var(--t3)", marginBottom: labelSuggestions[entry.course_name] ? "6px" : "14px" }}>{entry.university_name}</p>
                    {labelAIStatus !== "idle" && labelSuggestions[entry.course_name] && (
                      <p style={{ fontSize: "11px", color: "var(--t3)", fontStyle: "italic", marginBottom: "10px", lineHeight: 1.5 }}>
                        AI suggests: <strong style={{ color: "var(--t2)", fontStyle: "normal" }}>{labelSuggestions[entry.course_name].label}</strong>
                        {" · "}{labelSuggestions[entry.course_name].reason}
                      </p>
                    )}
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <div style={{ flex: 1, height: "3px", borderRadius: "2px", background: "var(--s3)", overflow: "hidden" }}>
                        <div style={{ height: "100%", borderRadius: "2px", background: bs.bar, width: `${entry.chance_percent}%`, opacity: 0.8 }} />
                      </div>
                      <span className="serif" style={{ fontSize: "18px", color: "var(--t)", minWidth: "44px", textAlign: "right" }}>{entry.chance_percent}%</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px", flexShrink: 0, position: "relative" }}>
                    {isLabelOpen ? (
                      <div className="glass-dark" style={{ borderRadius: "10px", padding: "6px", minWidth: "120px", position: "absolute", top: 0, right: 0, zIndex: 10 }}>
                        {LABELS.map(l => (
                          <button key={l} onClick={() => handleLabel(entry.id!, l)} style={{ display: "block", width: "100%", textAlign: "left", background: "transparent", border: "none", color: "var(--t2)", fontSize: "13px", padding: "7px 10px", borderRadius: "7px", cursor: "pointer", fontFamily: "var(--font-dm, var(--sans))", transition: "background 120ms" }}
                            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--s3)"}
                            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
                            {l}
                          </button>
                        ))}
                        <button onClick={() => setLabelOpen(null)} style={{ display: "block", width: "100%", textAlign: "left", background: "transparent", border: "none", color: "var(--t3)", fontSize: "12px", padding: "6px 10px", cursor: "pointer", fontFamily: "var(--font-dm, var(--sans))" }}>Cancel</button>
                      </div>
                    ) : (
                      <>
                        <button onClick={() => setLabelOpen(entry.id!)} style={{ background: "transparent", border: `1px solid ${savedId === entry.id ? "var(--safe-b)" : "var(--b)"}`, borderRadius: "9999px", color: savedId === entry.id ? "var(--safe-t)" : "var(--t3)", fontSize: "11px", padding: "4px 12px", cursor: "pointer", fontFamily: "var(--font-dm, var(--sans))", transition: "all 150ms" }}
                          onMouseEnter={e => { if (savedId !== entry.id) { (e.currentTarget as HTMLElement).style.borderColor = "var(--b-strong)"; (e.currentTarget as HTMLElement).style.color = "var(--t2)"; } }}
                          onMouseLeave={e => { if (savedId !== entry.id) { (e.currentTarget as HTMLElement).style.borderColor = "var(--b)"; (e.currentTarget as HTMLElement).style.color = "var(--t3)"; } }}>
                          {savedId === entry.id ? `✓ ${entry.label}` : (entry.label || "Label ▾")}
                        </button>
                        <button onClick={() => handleDelete(entry.id!)} style={{ background: "transparent", border: "none", color: "var(--t3)", fontSize: "12px", cursor: "pointer", fontFamily: "var(--font-dm, var(--sans))", transition: "color 150ms" }}
                          onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "var(--rch-t)"}
                          onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "var(--t3)"}>
                          Remove
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {entries.length < 5 && (
            <Link href="/dashboard/assess" className="link-dashed-add"
              style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "18px", borderStyle: "dashed", borderWidth: "1px", borderRadius: "var(--r)", fontSize: "13px" }}>
              + Add another choice ({5 - entries.length} remaining)
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
