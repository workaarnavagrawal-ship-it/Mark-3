"use client";
import { useState } from "react";
import Link from "next/link";
import type { Profile, SubjectEntry, TrackerEntry } from "@/lib/types";

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
        <p style={{ fontSize: "14px", color: "var(--t3)", lineHeight: 1.65 }}>Build a smarter shortlist. Analyse your mix, improve your PS, and find alternatives you haven't considered.</p>
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

              {/* Advice */}
              {mix.advice.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "24px" }}>
                  {mix.advice.map((tip, i) => (
                    <div key={i} style={{ padding: "14px 18px", background: "var(--s1)", border: "1px solid var(--b)", borderRadius: "var(--ri)", display: "flex", gap: "12px" }}>
                      <span style={{ color: "var(--acc)", flexShrink: 0, marginTop: "1px" }}>→</span>
                      <p style={{ fontSize: "13px", color: "var(--t2)", lineHeight: 1.65 }}>{tip}</p>
                    </div>
                  ))}
                </div>
              )}

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
                  <Link href="/dashboard/assess" style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "14px", border: "1px dashed var(--b)", borderRadius: "10px", color: "var(--t3)", fontSize: "13px", textDecoration: "none", marginTop: "6px", transition: "all 150ms" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--b-strong)"; (e.currentTarget as HTMLElement).style.color = "var(--t2)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--b)"; (e.currentTarget as HTMLElement).style.color = "var(--t3)"; }}>
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
                You haven't added your PS yet. <Link href="/dashboard/profile" style={{ color: "var(--acc)", textDecoration: "none" }}>Add it in your profile →</Link> — it improves prediction accuracy and unlocks PS analysis.
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
          <div style={{ marginBottom: "20px" }}>
            <p style={{ fontSize: "14px", color: "var(--t3)", lineHeight: 1.65, marginBottom: "20px" }}>
              Courses that align with your interests and background — including some less obvious paths worth considering.
            </p>
          </div>

          {profile.interests?.length === 0 ? (
            <div style={{ padding: "32px", textAlign: "center", background: "var(--s1)", border: "1px dashed var(--b)", borderRadius: "var(--r)" }}>
              <p style={{ fontSize: "14px", color: "var(--t3)", marginBottom: "16px" }}>Add interests to your profile to see personalised alternatives.</p>
              <Link href="/dashboard/profile" className="btn btn-ghost" style={{ fontSize: "13px" }}>Add interests →</Link>
            </div>
          ) : (
            <div>
              <p className="label" style={{ marginBottom: "14px" }}>Based on: {profile.interests?.join(", ")}</p>
              <p style={{ fontSize: "13px", color: "var(--t3)", marginBottom: "16px" }}>
                See the full explore page for more, including hidden gems you may not have considered.
              </p>
              <Link href="/dashboard/explore" className="btn btn-prim" style={{ marginBottom: "16px", display: "inline-flex" }}>Open Explore →</Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
