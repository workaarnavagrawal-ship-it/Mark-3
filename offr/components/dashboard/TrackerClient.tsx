"use client";
import { useState } from "react";
import Link from "next/link";
import { updateTrackerLabel, deleteTrackerEntry } from "@/lib/profile";
import type { TrackerEntry } from "@/lib/types";

const LABELS = ["Firm", "Insurance", "Backup", "Wildcard", "Undecided"];
const BS: Record<string, any> = {
  Safe:   { bg: "var(--safe-bg)", color: "var(--safe-t)", border: "1px solid var(--safe-b)", bar: "var(--safe-t)" },
  Target: { bg: "var(--tgt-bg)",  color: "var(--tgt-t)",  border: "1px solid var(--tgt-b)", bar: "var(--tgt-t)" },
  Reach:  { bg: "var(--rch-bg)",  color: "var(--rch-t)",  border: "1px solid var(--rch-b)", bar: "var(--rch-t)" },
};

export function TrackerClient({ initialAssessments }: { initialAssessments: TrackerEntry[] }) {
  const [entries, setEntries] = useState(initialAssessments);
  const [labelOpen, setLabelOpen] = useState<string | null>(null);

  async function handleLabel(id: string, label: string) {
    await updateTrackerLabel(id, label);
    setEntries(p => p.map(e => e.id === id ? { ...e, label } : e));
    setLabelOpen(null);
  }

  async function handleDelete(id: string) {
    await deleteTrackerEntry(id);
    setEntries(p => p.filter(e => e.id !== id));
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

      {entries.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "56px 32px", borderStyle: "dashed" }}>
          <h3 className="serif" style={{ fontSize: "22px", fontWeight: 400, color: "var(--t)", marginBottom: "10px" }}>No choices saved yet</h3>
          <p style={{ fontSize: "13px", color: "var(--t3)", marginBottom: "24px", lineHeight: 1.65 }}>Run an assessment and it'll appear here automatically.</p>
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
                    <p style={{ fontSize: "12px", color: "var(--t3)", marginBottom: "14px" }}>{entry.university_name}</p>
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
                        <button onClick={() => setLabelOpen(entry.id!)} style={{ background: "transparent", border: "1px solid var(--b)", borderRadius: "9999px", color: "var(--t3)", fontSize: "11px", padding: "4px 12px", cursor: "pointer", fontFamily: "var(--font-dm, var(--sans))", transition: "all 150ms" }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--b-strong)"; (e.currentTarget as HTMLElement).style.color = "var(--t2)"; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--b)"; (e.currentTarget as HTMLElement).style.color = "var(--t3)"; }}>
                          {entry.label || "Label ▾"}
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
