"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import type { Profile, SubjectEntry, TrackerEntry, SuggestCourse, PortfolioAdviceResponse } from "@/lib/types";
import { postSuggest, postPortfolioAdvice } from "@/lib/api";
import { AIBlock } from "@/components/ai/AIBlock";

const BS: Record<string, any> = {
  Safe:   { bg: "var(--safe-bg)", color: "var(--safe-t)", border: "1px solid var(--safe-b)", bar: "var(--safe-t)" },
  Target: { bg: "var(--tgt-bg)",  color: "var(--tgt-t)",  border: "1px solid var(--tgt-b)", bar: "var(--tgt-t)" },
  Reach:  { bg: "var(--rch-bg)",  color: "var(--rch-t)",  border: "1px solid var(--rch-b)", bar: "var(--rch-t)" },
};

// Mix analysis: what balance do they have?
function getMixAdvice(assessments: TrackerEntry[]) {
  const counts = { Safe: 0, Target: 0, Reach: 0 };
  assessments.forEach(a => { if (a.band in counts) counts[a.band as keyof typeof counts]++; });
  const total = assessments.length;
  if (total === 0) return null;

  const advice: string[] = [];
  if (counts.Reach > 2) advice.push("You have a lot of Reach choices — make sure you have a genuine Safe fallback.");
  if (counts.Safe === 0 && total >= 3) advice.push("No Safe choices yet. Add at least one course where you're comfortably above the threshold.");
  if (counts.Target === 0 && total >= 3) advice.push("A strong UCAS list usually has 2–3 Target choices as its spine.");
  if (counts.Safe >= 3) advice.push("Your list skews Safe. If you're ambitious, consider adding a Reach choice.");
  if (total < 5 && total > 0) advice.push(`You have ${total} of 5 choices. Try to complete your list before applying.`);

  const ideal = counts.Reach >= 1 && counts.Target >= 2 && counts.Safe >= 1;
  return { counts, total, advice, ideal };
}

const PS_TIPS = [
  { label: "Lead with intellectual curiosity", desc: "Don't open with 'I have always been interested in…'. Show a moment of genuine intellectual engagement — a book, question, or experience that shaped your thinking." },
  { label: "Use evidence, not claims", desc: "Don't say you're 'passionate' or 'hardworking'. Show what you actually did: a project, an EPQ, extended reading, a competition, a debate." },
  { label: "Connect supercurriculars to your subject", desc: "Every activity you mention should link back to why you want to study this specific course — not just what you did, but what it taught you." },
  { label: "Make it specific to the subject, not generic", desc: "Admissions tutors can tell when a PS would work for any course. Name books, ideas, thinkers, methods that are specific to your discipline." },
  { label: "End forward-looking, not backward-looking", desc: "End with what you want to explore at university level — a question you want to answer, a field you want to understand. Not just a recap." },
];

export function StrategyClient({ profile, subjects, assessments }: { profile: Profile; subjects: SubjectEntry[]; assessments: TrackerEntry[] }) {
  const [activeTab, setActiveTab] = useState<"mix" | "ps" | "alternatives">("mix");
  const mix = getMixAdvice(assessments);

  // ── Alternatives state ─────────────────────────────────────────
  const [alts, setAlts] = useState<SuggestCourse[]>([]);
  const [portfolioStrategy, setPortfolioStrategy] = useState<string | null>(null);
  const [altsStatus, setAltsStatus] = useState<"idle"|"loading"|"ok"|"error">("idle");
  const [altsErr, setAltsErr] = useState("");

  const loadAlts = useCallback(async () => {
    if (!profile.interests?.length) return;
    setAltsStatus("loading");
    setAltsErr("");
    try {
      const excludeNames = assessments.map((a) => a.course_name?.trim() ?? "").filter(Boolean);
      const res = await postSuggest({
        interests: profile.interests,
        curriculum: profile.curriculum,
        exclude_course_names: excludeNames,
        top_n: 6,
      });
      setAlts(res.suggestions ?? []);
      setPortfolioStrategy(res.portfolio_strategy ?? null);
      setAltsStatus("ok");
    } catch (e: unknown) {
      setAltsErr((e as Error)?.message || "Failed to load alternatives.");
      setAltsStatus("error");
    }
  }, [profile.interests, profile.curriculum, assessments]);

  // Fetch when alternatives tab first opens
  useEffect(() => {
    if (activeTab !== "alternatives") return;
    if (altsStatus !== "idle") return;
    loadAlts();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // ── Portfolio advice state ──────────────────────────────────────
  const [portfolioAdvice, setPortfolioAdvice] = useState<PortfolioAdviceResponse | null>(null);
  const [portfolioStatus, setPortfolioStatus] = useState<"idle"|"loading"|"ok"|"error">("idle");
  const [portfolioErr, setPortfolioErr] = useState("");

  const loadPortfolioAdvice = useCallback(async () => {
    if (!assessments.length) return;
    setPortfolioStatus("loading");
    setPortfolioErr("");
    const bands: Record<string, number> = { Safe: 0, Target: 0, Reach: 0 };
    assessments.forEach((a) => { if (a.band in bands) bands[a.band]++; });
    try {
      const res = await postPortfolioAdvice({
        curriculum: profile.curriculum,
        interests: profile.interests ?? [],
        bands,
        assessments: assessments.map((a) => ({
          course_name: a.course_name,
          university_name: a.university_name,
          band: a.band,
          chance_percent: a.chance_percent,
        })),
      });
      setPortfolioAdvice(res);
      setPortfolioStatus("ok");
    } catch (e: unknown) {
      setPortfolioErr((e as Error)?.message || "Could not load AI advice.");
      setPortfolioStatus("error");
    }
  }, [assessments, profile.curriculum, profile.interests]);

  // Fetch portfolio advice when mix tab first opens with assessments
  useEffect(() => {
    if (activeTab !== "mix") return;
    if (portfolioStatus !== "idle") return;
    if (!assessments.length) return;
    loadPortfolioAdvice();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const hl = subjects.filter(s => s.level === "HL");
  const sl = subjects.filter(s => s.level === "SL");
  const al = subjects.filter(s => s.level === "A_LEVEL");
  const haPS = !!(profile.ps_q1 || profile.ps_q2 || profile.ps_q3 || profile.ps_statement);

  const ibTotal = [...hl,...sl].reduce((s,x) => s+Number(x.predicted_grade),0) + (profile.core_points||0);

  return (
    <div style={{ padding: "48px 52px", maxWidth: "840px" }}>
      <div style={{ marginBottom: "40px" }}>
        <p className="label" style={{ marginBottom: "10px" }}>Optimizer</p>
        <h1 className="serif" style={{ fontSize: "44px", fontWeight: 400, color: "var(--t)", marginBottom: "10px", letterSpacing: "-0.02em" }}>Your Strategy</h1>
        <p style={{ fontSize: "14px", color: "var(--t3)", lineHeight: 1.65 }}>Build a smarter shortlist. Analyse your mix, improve your PS, and find alternatives you haven&apos;t considered.</p>
      </div>

      {/* Profile snapshot */}
      <div style={{ padding: "18px 22px", background: "var(--s1)", border: "1px solid var(--b)", borderRadius: "var(--r)", marginBottom: "28px", display: "flex", alignItems: "center", gap: "32px", flexWrap: "wrap" }}>
        <div>
          <p className="label" style={{ margin: 0, marginBottom: "4px" }}>Curriculum</p>
          <p style={{ fontSize: "14px", color: "var(--t2)" }}>{profile.curriculum === "IB" ? "IB Diploma" : "A Levels"}</p>
        </div>
        <div>
          <p className="label" style={{ margin: 0, marginBottom: "4px" }}>Predicted</p>
          <p style={{ fontSize: "14px", color: "var(--t2)" }}>
            {profile.curriculum === "IB" ? `${ibTotal} / 45 points` : al.map(s => `${s.subject}: ${s.predicted_grade}`).join(", ") || "—"}
          </p>
        </div>
        <div>
          <p className="label" style={{ margin: 0, marginBottom: "4px" }}>PS</p>
          <p style={{ fontSize: "14px", color: haPS ? "var(--safe-t)" : "var(--t3)" }}>{haPS ? "✓ Saved" : "Not added"}</p>
        </div>
        <div>
          <p className="label" style={{ margin: 0, marginBottom: "4px" }}>Interests</p>
          <p style={{ fontSize: "14px", color: "var(--t2)" }}>{profile.interests?.join(", ") || "None set"}</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "4px", marginBottom: "28px", background: "var(--s2)", borderRadius: "var(--ri)", padding: "4px", width: "fit-content" }}>
        {([["mix","Choice mix"],["ps","PS strategy"],["alternatives","Alternatives"]] as const).map(([id, label]) => (
          <button key={id} onClick={() => setActiveTab(id)} style={{
            padding: "8px 18px", borderRadius: "10px", border: "none", fontSize: "13px", cursor: "pointer",
            background: activeTab === id ? "var(--s1)" : "transparent",
            color: activeTab === id ? "var(--t)" : "var(--t3)",
            fontWeight: activeTab === id ? 500 : 400, transition: "all 150ms",
            fontFamily: "var(--font-dm, var(--sans))",
          }}>
            {label}
          </button>
        ))}
      </div>

      {/* Mix tab */}
      {activeTab === "mix" && (
        <div className="fade-in">
          {!mix ? (
            <div style={{ padding: "48px 32px", textAlign: "center", background: "var(--s1)", border: "1px dashed var(--b)", borderRadius: "var(--r)" }}>
              <h3 className="serif" style={{ fontSize: "22px", fontWeight: 400, color: "var(--t)", marginBottom: "10px" }}>No choices assessed yet</h3>
              <p style={{ fontSize: "13px", color: "var(--t3)", marginBottom: "24px", lineHeight: 1.65 }}>Once you run assessments, your mix will appear here with advice.</p>
              <Link href="/dashboard/assess" className="btn btn-prim">Check offer chances →</Link>
            </div>
          ) : (
            <>
              {/* Mix breakdown */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "10px", marginBottom: "20px" }}>
                {(["Safe","Target","Reach"] as const).map(band => {
                  const bs = BS[band];
                  return (
                    <div key={band} style={{ padding: "20px", background: bs.bg, border: bs.border, borderRadius: "var(--r)" }}>
                      <p className="serif" style={{ fontSize: "40px", fontWeight: 400, color: bs.color, lineHeight: 1, marginBottom: "4px" }}>{mix.counts[band]}</p>
                      <p style={{ fontSize: "11px", color: bs.color, opacity: 0.7, textTransform: "uppercase", letterSpacing: "0.06em" }}>{band}</p>
                    </div>
                  );
                })}
              </div>

              {/* Ideal badge */}
              <div style={{ padding: "14px 18px", marginBottom: "20px", borderRadius: "var(--ri)", background: mix.ideal ? "var(--safe-bg)" : "var(--tgt-bg)", border: `1px solid ${mix.ideal ? "var(--safe-b)" : "var(--tgt-b)"}` }}>
                <p style={{ fontSize: "13px", color: mix.ideal ? "var(--safe-t)" : "var(--tgt-t)", lineHeight: 1.6 }}>
                  {mix.ideal ? "✓ Your mix looks well-balanced. A Reach, 2+ Targets, and a Safe." : "Your mix could be stronger. See advice below."}
                </p>
              </div>

              {/* Rule-based advice */}
              {mix.advice.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
                  {mix.advice.map((tip, i) => (
                    <div key={i} style={{ padding: "14px 18px", background: "var(--s1)", border: "1px solid var(--b)", borderRadius: "var(--ri)", display: "flex", gap: "12px" }}>
                      <span style={{ color: "var(--acc)", flexShrink: 0, marginTop: "1px" }}>→</span>
                      <p style={{ fontSize: "13px", color: "var(--t2)", lineHeight: 1.65 }}>{tip}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* AI portfolio strategy block */}
              <div style={{ marginBottom: "24px" }}>
                <p className="label" style={{ marginBottom: "10px" }}>AI portfolio assessment</p>
                <AIBlock
                  status={portfolioStatus}
                  error={portfolioErr || undefined}
                  onRetry={loadPortfolioAdvice}
                  skeletonLines={2}
                >
                  {portfolioAdvice && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      <div style={{ padding: "14px 18px", background: "var(--s1)", border: "1px solid var(--b)", borderRadius: "var(--ri)" }}>
                        <p style={{ fontSize: "13px", color: "var(--t2)", lineHeight: 1.65, marginBottom: "6px" }}>
                          {portfolioAdvice.strategy_summary}
                        </p>
                        <span style={{ fontSize: "11px", color: "var(--t3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                          {portfolioAdvice.risk_balance}
                        </span>
                      </div>
                      {portfolioAdvice.actions.map((action, i) => (
                        <div key={i} style={{ padding: "12px 18px", background: "var(--s1)", border: "1px solid var(--b)", borderRadius: "var(--ri)", display: "flex", gap: "10px" }}>
                          <span style={{ color: "var(--acc)", flexShrink: 0 }}>→</span>
                          <p style={{ fontSize: "13px", color: "var(--t2)", lineHeight: 1.6 }}>{action}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </AIBlock>
              </div>

              {/* Choice list */}
              <div>
                <p className="label" style={{ marginBottom: "12px" }}>Your choices so far</p>
                {assessments.map(a => {
                  const bs = BS[a.band] || BS.Reach;
                  return (
                    <div key={a.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", background: "var(--s1)", border: "1px solid var(--b)", borderRadius: "10px", marginBottom: "6px" }}>
                      <div>
                        <p style={{ fontSize: "14px", color: "var(--t)", fontWeight: 500, marginBottom: "2px" }}>{a.course_name}</p>
                        <p style={{ fontSize: "12px", color: "var(--t3)" }}>{a.university_name}</p>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span className="serif" style={{ fontSize: "18px", color: "var(--t)" }}>{a.chance_percent}%</span>
                        <span className="pill" style={{ background: bs.bg, color: bs.color, border: bs.border }}>{a.band}</span>
                      </div>
                    </div>
                  );
                })}
                {assessments.length < 5 && (
                  <Link href="/dashboard/assess" className="link-dashed-add"
                    style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "14px", borderStyle: "dashed", borderWidth: "1px", borderRadius: "10px", fontSize: "13px", marginTop: "6px" }}>
                    + Add choice ({5 - assessments.length} remaining)
                  </Link>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* PS strategy tab */}
      {activeTab === "ps" && (
        <div className="fade-in">
          {!haPS && (
            <div style={{ padding: "16px 20px", background: "var(--tgt-bg)", border: "1px solid var(--tgt-b)", borderRadius: "var(--ri)", marginBottom: "24px" }}>
              <p style={{ fontSize: "13px", color: "var(--tgt-t)", lineHeight: 1.65 }}>
                You haven&apos;t added your PS yet. <Link href="/dashboard/profile" style={{ color: "var(--acc)", textDecoration: "none" }}>Add it in your profile →</Link> — it improves prediction accuracy and unlocks PS analysis.
              </p>
            </div>
          )}

          <div style={{ marginBottom: "20px" }}>
            <p className="label" style={{ marginBottom: "4px" }}>What makes a strong PS at selective UK universities</p>
            <p style={{ fontSize: "13px", color: "var(--t3)", marginBottom: "20px", lineHeight: 1.65 }}>Based on patterns in 4,000+ applicant profiles from 2024–25.</p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "24px" }}>
            {PS_TIPS.map((tip, i) => (
              <div key={i} style={{ padding: "18px 20px", background: "var(--s1)", border: "1px solid var(--b)", borderRadius: "var(--ri)" }}>
                <p style={{ fontSize: "14px", color: "var(--t)", fontWeight: 500, marginBottom: "8px" }}>{i+1}. {tip.label}</p>
                <p style={{ fontSize: "13px", color: "var(--t3)", lineHeight: 1.7 }}>{tip.desc}</p>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <Link href="/dashboard/ps" className="btn btn-prim">Get line-by-line feedback →</Link>
            {!haPS && <Link href="/dashboard/profile" className="btn btn-ghost">Add my PS</Link>}
          </div>
        </div>
      )}

      {/* Alternatives tab */}
      {activeTab === "alternatives" && (
        <div className="fade-in">
          <p style={{ fontSize: "14px", color: "var(--t3)", lineHeight: 1.65, marginBottom: "20px" }}>
            Courses that align with your interests — excluding choices you&apos;ve already assessed.
          </p>

          {!profile.interests?.length ? (
            <div style={{ padding: "32px", textAlign: "center", background: "var(--s1)", border: "1px dashed var(--b)", borderRadius: "var(--r)" }}>
              <p style={{ fontSize: "14px", color: "var(--t3)", marginBottom: "16px" }}>Add interests to your profile to see personalised alternatives.</p>
              <Link href="/dashboard/profile" className="btn btn-ghost" style={{ fontSize: "13px" }}>Add interests →</Link>
            </div>
          ) : (
            <>
              {/* AI portfolio strategy note */}
              {portfolioStrategy && (
                <div style={{ padding: "14px 18px", background: "var(--s1)", border: "1px solid var(--b)", borderRadius: "var(--ri)", marginBottom: "20px", display: "flex", gap: "10px" }}>
                  <span style={{ color: "var(--acc)", flexShrink: 0, marginTop: "1px" }}>AI</span>
                  <p style={{ fontSize: "13px", color: "var(--t2)", lineHeight: 1.65 }}>{portfolioStrategy}</p>
                </div>
              )}

              <AIBlock
                status={altsStatus}
                error={altsErr || undefined}
                onRetry={loadAlts}
                skeletonLines={4}
              >
                {alts.length === 0 && altsStatus === "ok" ? (
                  <div style={{ padding: "32px", textAlign: "center", background: "var(--s1)", border: "1px dashed var(--b)", borderRadius: "var(--r)" }}>
                    <p style={{ fontSize: "14px", color: "var(--t3)", marginBottom: "16px" }}>
                      No additional matches found for your interests. Try updating your profile or exploring the full catalogue.
                    </p>
                    <Link href="/dashboard/explore" className="btn btn-ghost" style={{ fontSize: "13px" }}>Open Explore →</Link>
                  </div>
                ) : alts.length > 0 ? (
                  <>
                    <p className="label" style={{ marginBottom: "14px" }}>Based on: {profile.interests.join(", ")}</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "20px" }}>
                      {alts.map((course) => (
                        <div key={course.course_name} style={{
                          padding: "16px 20px",
                          background: "var(--s1)",
                          border: "1px solid var(--b)",
                          borderRadius: "var(--r)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "16px",
                        }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: "14px", fontWeight: 500, color: "var(--t)", marginBottom: "3px" }}>{course.course_name}</p>
                            <p style={{ fontSize: "12px", color: "var(--t3)", marginBottom: "3px" }}>
                              {course.universities_count} {course.universities_count === 1 ? "university" : "universities"}
                              {course.faculties.length > 0 && ` · ${course.faculties[0]}`}
                            </p>
                            <p style={{ fontSize: "11px", color: "var(--t3)", opacity: 0.75, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {course.tradeoff || course.reason}
                            </p>
                          </div>
                          <Link
                            href={`/dashboard/assess?query=${encodeURIComponent(course.course_name)}`}
                            style={{
                              flexShrink: 0, fontSize: "12px", padding: "8px 14px",
                              border: "1px solid var(--b)", borderRadius: "var(--r)",
                              color: "var(--t2)", textDecoration: "none", whiteSpace: "nowrap",
                            }}
                          >
                            Check chances →
                          </Link>
                        </div>
                      ))}
                    </div>
                    <Link href="/dashboard/explore" style={{ fontSize: "13px", color: "var(--acc)", textDecoration: "none" }}>
                      See more in Explore →
                    </Link>
                  </>
                ) : null}
              </AIBlock>
            </>
          )}
        </div>
      )}
    </div>
  );
}
