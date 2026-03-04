"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FitScore } from "@/components/ui/FitScore";
import { PersonaBadge } from "@/components/ui/PersonaBadge";
import type { Profile, SubjectEntry, TrackerEntry, ShortlistItem, PersonaCode } from "@/lib/types";

// ── Local DB shape ────────────────────────────────────────────────────────────
interface StrategySlot {
  id: string;
  slot: number;
  course_id: string;
  university_id: string;
  university_name: string;
  course_name: string;
  degree_type: string | null;
  typical_offer: string | null;
  notes: string | null;
}

interface Props {
  profile: Profile;
  subjects: SubjectEntry[];
  assessments: TrackerEntry[];
  strategySlots: StrategySlot[];
  shortlistItems: ShortlistItem[];
}

const BAND_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  Safe:   { bg: "var(--safe-bg)", color: "var(--safe-t)", border: "1px solid var(--safe-b)" },
  Target: { bg: "var(--tgt-bg)",  color: "var(--tgt-t)",  border: "1px solid var(--tgt-b)" },
  Reach:  { bg: "var(--rch-bg)",  color: "var(--rch-t)",  border: "1px solid var(--rch-b)" },
};

function getMix(assessments: TrackerEntry[]) {
  const counts = { Safe: 0, Target: 0, Reach: 0 };
  assessments.forEach(a => { if (a.band in counts) counts[a.band as keyof typeof counts]++; });
  const total = assessments.length;
  const ideal = counts.Reach >= 1 && counts.Target >= 2 && counts.Safe >= 1;
  const tips: string[] = [];
  if (total >= 3) {
    if (counts.Reach > 2) tips.push("Heavy on Reaches — add a genuine Safe fallback.");
    if (counts.Safe === 0) tips.push("No Safe choices yet. Aim for at least one.");
    if (counts.Target === 0) tips.push("A strong list has 2–3 Targets as its spine.");
    if (counts.Safe >= 3) tips.push("Skews Safe — consider a Reach if you're ambitious.");
  }
  if (total < 5 && total > 0) tips.push(`${total} of 5 choices added. Complete your list before applying.`);
  return { counts, total, ideal, tips };
}

export function StrategyClient({ profile, subjects, assessments, strategySlots, shortlistItems }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // slot → ShortlistItem picker
  const [pickingSlot, setPickingSlot] = useState<number | null>(null);
  // inline notes editing
  const [editingSlot, setEditingSlot] = useState<number | null>(null);
  const [notesDraft, setNotesDraft] = useState("");
  // loading per-slot
  const [loadingSlot, setLoadingSlot] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const slotsMap = new Map<number, StrategySlot>();
  strategySlots.forEach(s => slotsMap.set(s.slot, s));

  const filledCount = slotsMap.size;
  const persona: PersonaCode = (profile.persona as PersonaCode) || "FINISHER";

  // Only OFFERING items can go straight into strategy (have a specific course_id)
  const offeringCandidates = shortlistItems.filter(i => i.item_type === "OFFERING" && i.course_id);
  const groupCandidates    = shortlistItems.filter(i => i.item_type === "COURSE_GROUP");

  const mix = getMix(assessments);

  // ── Actions ──────────────────────────────────────────────────────────────
  async function assignSlot(slot: number, item: ShortlistItem) {
    setLoadingSlot(slot);
    setError(null);
    try {
      const res = await fetch("/api/strategy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slot,
          course_id: item.course_id ?? item.course_group_key ?? "",
          university_id: "",
          university_name: item.university_name ?? "",
          course_name: item.course_name,
          notes: item.reason ?? null,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      setPickingSlot(null);
      startTransition(() => router.refresh());
    } catch (e: unknown) {
      setError((e as Error)?.message || "Failed to assign slot.");
    } finally {
      setLoadingSlot(null);
    }
  }

  async function clearSlot(slot: number) {
    setLoadingSlot(slot);
    setError(null);
    try {
      const res = await fetch(`/api/strategy/${slot}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      startTransition(() => router.refresh());
    } catch (e: unknown) {
      setError((e as Error)?.message || "Failed to clear slot.");
    } finally {
      setLoadingSlot(null);
    }
  }

  async function saveNotes(slot: number) {
    setError(null);
    try {
      const existing = slotsMap.get(slot);
      if (!existing) return;
      const res = await fetch("/api/strategy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...existing, notes: notesDraft || null }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setEditingSlot(null);
      startTransition(() => router.refresh());
    } catch (e: unknown) {
      setError((e as Error)?.message || "Failed to save notes.");
    }
  }

  const ibTotal = profile.ib_total_points
    ?? ((subjects.filter(s => s.level !== "A_LEVEL").reduce((a, x) => a + Number(x.predicted_grade), 0)) + (profile.ib_bonus_points ?? profile.core_points ?? 0));

  return (
    <div style={{ padding: "48px 52px", maxWidth: "860px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "36px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <p className="label" style={{ marginBottom: "8px" }}>My Strategy</p>
          <h1 className="serif" style={{ fontSize: "40px", fontWeight: 400, color: "var(--t)", letterSpacing: "-0.02em", marginBottom: "8px" }}>
            Your 5 UCAS Choices
          </h1>
          <p style={{ fontSize: "14px", color: "var(--t3)", lineHeight: 1.6 }}>
            Build and review your final application strategy. Aim for a balanced mix of Safe, Target, and Reach.
          </p>
        </div>
        <PersonaBadge persona={persona} />
      </div>

      {/* Error banner */}
      {error && (
        <div style={{ padding: "12px 16px", background: "var(--rch-bg)", border: "1px solid var(--rch-b)", borderRadius: "var(--ri)", marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <p style={{ fontSize: "13px", color: "var(--rch-t)" }}>{error}</p>
          <button onClick={() => setError(null)} style={{ background: "none", border: "none", color: "var(--rch-t)", cursor: "pointer", fontSize: "16px", lineHeight: 1 }}>×</button>
        </div>
      )}

      {/* Progress bar */}
      <div style={{ marginBottom: "32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
          <p style={{ fontSize: "13px", color: "var(--t3)" }}>Slots filled</p>
          <p style={{ fontSize: "13px", fontWeight: 500, color: filledCount === 5 ? "var(--safe-t)" : "var(--t2)" }}>
            {filledCount} / 5 {filledCount === 5 && "✓ Complete"}
          </p>
        </div>
        <div style={{ height: "4px", background: "var(--b)", borderRadius: "2px", overflow: "hidden" }}>
          <div style={{
            height: "100%",
            borderRadius: "2px",
            width: `${(filledCount / 5) * 100}%`,
            background: filledCount === 5 ? "var(--safe-t)" : "var(--persona-strategist)",
            transition: "width 400ms ease",
          }} />
        </div>
      </div>

      {/* 5 Slot cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "40px" }}>
        {[1, 2, 3, 4, 5].map(slot => {
          const filled = slotsMap.get(slot);
          const isLoading = loadingSlot === slot || (isPending && loadingSlot === null);
          const isPicking = pickingSlot === slot;
          const isEditing = editingSlot === slot;

          if (filled) {
            const bandInfo = assessments.find(a => a.course_id === filled.course_id);
            const bs = bandInfo ? BAND_STYLE[bandInfo.band] : null;

            return (
              <div key={slot} className="mono-card" style={{ padding: "20px 24px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px" }}>
                  <div style={{ display: "flex", gap: "14px", alignItems: "flex-start", flex: 1 }}>
                    {/* Slot badge */}
                    <div style={{
                      width: "32px", height: "32px", borderRadius: "50%", flexShrink: 0,
                      background: "var(--persona-strategist-bg)", border: "1px solid var(--persona-strategist-b)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "13px", fontWeight: 600, color: "var(--persona-strategist)",
                    }}>{slot}</div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: "15px", fontWeight: 500, color: "var(--t)", marginBottom: "3px" }}>
                        {filled.course_name}
                      </p>
                      <p style={{ fontSize: "13px", color: "var(--t3)", marginBottom: "8px" }}>
                        {filled.university_name}
                        {filled.degree_type && <span style={{ opacity: 0.7 }}> · {filled.degree_type}</span>}
                      </p>

                      {/* Chips row */}
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
                        {filled.typical_offer && (
                          <span style={{ fontSize: "11px", padding: "3px 8px", background: "var(--s2)", border: "1px solid var(--b)", borderRadius: "12px", color: "var(--t3)" }}>
                            Offer: {filled.typical_offer}
                          </span>
                        )}
                        {bs && bandInfo && (
                          <span style={{ fontSize: "11px", padding: "3px 8px", borderRadius: "12px", ...bs }}>
                            {bandInfo.band} · {bandInfo.chance_percent}%
                          </span>
                        )}
                      </div>

                      {/* Notes */}
                      {isEditing ? (
                        <div style={{ marginTop: "10px", display: "flex", gap: "8px" }}>
                          <input
                            value={notesDraft}
                            onChange={e => setNotesDraft(e.target.value)}
                            placeholder="Add a note (e.g. Firm choice, need to retake Maths)"
                            style={{
                              flex: 1, padding: "8px 12px", fontSize: "13px",
                              background: "var(--bg)", border: "1px solid var(--b)", borderRadius: "var(--ri)",
                              color: "var(--t)", outline: "none",
                            }}
                            onKeyDown={e => { if (e.key === "Enter") saveNotes(slot); if (e.key === "Escape") setEditingSlot(null); }}
                            autoFocus
                          />
                          <button onClick={() => saveNotes(slot)} style={{ padding: "8px 14px", background: "var(--persona-strategist-bg)", border: "1px solid var(--persona-strategist-b)", borderRadius: "var(--ri)", fontSize: "12px", color: "var(--persona-strategist)", cursor: "pointer" }}>
                            Save
                          </button>
                          <button onClick={() => setEditingSlot(null)} style={{ padding: "8px 14px", background: "transparent", border: "1px solid var(--b)", borderRadius: "var(--ri)", fontSize: "12px", color: "var(--t3)", cursor: "pointer" }}>
                            Cancel
                          </button>
                        </div>
                      ) : filled.notes ? (
                        <button
                          onClick={() => { setEditingSlot(slot); setNotesDraft(filled.notes ?? ""); }}
                          style={{ marginTop: "8px", background: "none", border: "none", padding: 0, textAlign: "left", cursor: "pointer" }}
                        >
                          <p style={{ fontSize: "12px", color: "var(--t3)", fontStyle: "italic" }}>"{filled.notes}"</p>
                        </button>
                      ) : (
                        <button
                          onClick={() => { setEditingSlot(slot); setNotesDraft(""); }}
                          style={{ marginTop: "8px", background: "none", border: "none", padding: 0, fontSize: "12px", color: "var(--t3)", cursor: "pointer", textDecoration: "underline", textDecorationStyle: "dotted" }}
                        >
                          + Add note
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Remove button */}
                  <button
                    onClick={() => clearSlot(slot)}
                    disabled={!!isLoading}
                    style={{
                      padding: "6px 10px", background: "transparent", border: "1px solid var(--b)",
                      borderRadius: "var(--ri)", fontSize: "12px", color: "var(--t3)", cursor: "pointer",
                      flexShrink: 0, opacity: isLoading ? 0.5 : 1,
                    }}
                  >
                    {isLoading ? "…" : "Remove"}
                  </button>
                </div>
              </div>
            );
          }

          // Empty slot
          return (
            <div key={slot}>
              <button
                onClick={() => setPickingSlot(isPicking ? null : slot)}
                disabled={!!loadingSlot}
                style={{
                  width: "100%", padding: "20px 24px", background: "transparent",
                  border: "1px dashed var(--b)", borderRadius: "var(--r)",
                  cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: "14px",
                  transition: "border-color 150ms, background 150ms",
                }}
                onMouseOver={e => (e.currentTarget.style.borderColor = "var(--persona-strategist)")}
                onMouseOut={e => (e.currentTarget.style.borderColor = "var(--b)")}
              >
                <div style={{
                  width: "32px", height: "32px", borderRadius: "50%", flexShrink: 0,
                  background: "var(--s1)", border: "1px dashed var(--b)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "13px", color: "var(--t3)",
                }}>{slot}</div>
                <p style={{ fontSize: "14px", color: "var(--t3)" }}>
                  {isPicking ? "Select a course below ↓" : `Fill slot ${slot}`}
                </p>
              </button>

              {/* Picker */}
              {isPicking && (
                <div style={{ marginTop: "8px", padding: "16px", background: "var(--mono-card-bg)", border: "1px solid var(--mono-card-b)", borderRadius: "var(--r)" }}>
                  {offeringCandidates.length === 0 && groupCandidates.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "20px" }}>
                      <p style={{ fontSize: "13px", color: "var(--t3)", marginBottom: "12px" }}>
                        No shortlisted courses yet.
                      </p>
                      <Link href="/dashboard/explore" style={{ fontSize: "13px", color: "var(--persona-strategist)", textDecoration: "none" }}>
                        Explore the database →
                      </Link>
                    </div>
                  ) : (
                    <>
                      {offeringCandidates.length > 0 && (
                        <div style={{ marginBottom: groupCandidates.length > 0 ? "12px" : 0 }}>
                          <p className="label" style={{ marginBottom: "8px" }}>From shortlist</p>
                          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                            {offeringCandidates.map(item => (
                              <button
                                key={item.id}
                                onClick={() => assignSlot(slot, item)}
                                disabled={loadingSlot === slot}
                                style={{
                                  padding: "12px 16px", background: "var(--s1)", border: "1px solid var(--b)",
                                  borderRadius: "var(--ri)", cursor: "pointer", textAlign: "left",
                                  display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px",
                                  transition: "border-color 150ms",
                                }}
                                onMouseOver={e => (e.currentTarget.style.borderColor = "var(--persona-strategist)")}
                                onMouseOut={e => (e.currentTarget.style.borderColor = "var(--b)")}
                              >
                                <div style={{ minWidth: 0 }}>
                                  <p style={{ fontSize: "13px", fontWeight: 500, color: "var(--t)", marginBottom: "2px" }}>{item.course_name}</p>
                                  {item.university_name && (
                                    <p style={{ fontSize: "12px", color: "var(--t3)" }}>{item.university_name}</p>
                                  )}
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                                  {item.fit_score != null && <FitScore score={item.fit_score} variant="pill" />}
                                  <span style={{ fontSize: "12px", color: "var(--persona-strategist)" }}>
                                    {loadingSlot === slot ? "…" : "Add →"}
                                  </span>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {groupCandidates.length > 0 && (
                        <div>
                          <p className="label" style={{ marginBottom: "8px" }}>Course groups (pick specific university first)</p>
                          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                            {groupCandidates.map(item => (
                              <div key={item.id} style={{ padding: "12px 16px", background: "var(--s1)", border: "1px solid var(--b)", borderRadius: "var(--ri)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", opacity: 0.6 }}>
                                <div>
                                  <p style={{ fontSize: "13px", color: "var(--t2)" }}>{item.course_name}</p>
                                  <p style={{ fontSize: "11px", color: "var(--t3)" }}>Assess a specific offering to add to strategy</p>
                                </div>
                                <Link href={`/dashboard/explore?q=${encodeURIComponent(item.course_name)}`} style={{ fontSize: "12px", color: "var(--acc)", textDecoration: "none", flexShrink: 0 }}>
                                  Explore →
                                </Link>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid var(--b)" }}>
                        <Link href="/dashboard/explore" style={{ fontSize: "12px", color: "var(--t3)", textDecoration: "none" }}>
                          Browse all courses →
                        </Link>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Mix insight */}
      {assessments.length > 0 && (
        <div style={{ marginBottom: "40px" }}>
          <p className="label" style={{ marginBottom: "14px" }}>Assessed choices mix</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", marginBottom: "12px" }}>
            {(["Safe", "Target", "Reach"] as const).map(band => {
              const bs = BAND_STYLE[band];
              return (
                <div key={band} style={{ padding: "16px", background: bs.bg, border: bs.border, borderRadius: "var(--r)", textAlign: "center" }}>
                  <p className="serif" style={{ fontSize: "32px", fontWeight: 400, color: bs.color, lineHeight: 1, marginBottom: "4px" }}>
                    {mix.counts[band]}
                  </p>
                  <p style={{ fontSize: "11px", color: bs.color, opacity: 0.8, textTransform: "uppercase", letterSpacing: "0.06em" }}>{band}</p>
                </div>
              );
            })}
          </div>

          {mix.ideal ? (
            <div style={{ padding: "12px 16px", background: "var(--safe-bg)", border: "1px solid var(--safe-b)", borderRadius: "var(--ri)" }}>
              <p style={{ fontSize: "13px", color: "var(--safe-t)" }}>✓ Well-balanced mix — a Reach, 2+ Targets, and a Safe.</p>
            </div>
          ) : mix.tips.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {mix.tips.map((tip, i) => (
                <div key={i} style={{ padding: "10px 14px", background: "var(--s1)", border: "1px solid var(--b)", borderRadius: "var(--ri)", display: "flex", gap: "10px" }}>
                  <span style={{ color: "var(--acc)", flexShrink: 0 }}>→</span>
                  <p style={{ fontSize: "13px", color: "var(--t2)", lineHeight: 1.6 }}>{tip}</p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      )}

      {/* Profile snapshot */}
      <div style={{ padding: "16px 20px", background: "var(--s1)", border: "1px solid var(--b)", borderRadius: "var(--r)", marginBottom: "32px", display: "flex", gap: "28px", flexWrap: "wrap" }}>
        <div>
          <p className="label" style={{ marginBottom: "3px" }}>Curriculum</p>
          <p style={{ fontSize: "13px", color: "var(--t2)" }}>{profile.curriculum === "IB" ? "IB Diploma" : "A Levels"}</p>
        </div>
        <div>
          <p className="label" style={{ marginBottom: "3px" }}>Predicted</p>
          <p style={{ fontSize: "13px", color: "var(--t2)" }}>
            {profile.curriculum === "IB"
              ? `${ibTotal} / 45`
              : subjects.filter(s => s.level === "A_LEVEL").map(s => `${s.subject}: ${s.predicted_grade}`).join(", ") || "—"
            }
          </p>
        </div>
        <div>
          <p className="label" style={{ marginBottom: "3px" }}>Status</p>
          <p style={{ fontSize: "13px", color: "var(--t2)" }}>
            {profile.home_or_intl?.toUpperCase() === "INTL" ? "International" : "Home (UK)"}
          </p>
        </div>
        {profile.interest_tags && profile.interest_tags.length > 0 && (
          <div>
            <p className="label" style={{ marginBottom: "3px" }}>Interests</p>
            <p style={{ fontSize: "13px", color: "var(--t2)" }}>{profile.interest_tags.slice(0, 3).join(", ")}</p>
          </div>
        )}
      </div>

      {/* CTAs */}
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <Link href="/dashboard/explore" className="btn btn-prim" style={{ fontSize: "13px" }}>
          Explore courses →
        </Link>
        <Link href="/dashboard/assess" className="btn btn-ghost" style={{ fontSize: "13px" }}>
          Check offer chances
        </Link>
        <Link href="/dashboard/ps" className="btn btn-ghost" style={{ fontSize: "13px" }}>
          PS feedback
        </Link>
      </div>
    </div>
  );
}
