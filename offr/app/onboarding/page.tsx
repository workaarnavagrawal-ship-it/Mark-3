"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { PersonaV2 } from "@/lib/types";

const INTERESTS = [
  "Economics", "Law", "Computer Science", "Medicine", "Engineering",
  "Mathematics", "History", "Philosophy", "Politics", "Psychology",
  "Business", "Architecture", "Biology", "Chemistry", "Physics",
  "Literature", "Art & Design", "Music", "Geography", "Sociology",
  "Environmental Science", "Linguistics", "Classics", "Anthropology",
];

const PERSONAS: {
  id: PersonaV2;
  name: string;
  title: string;
  quote: string;
  description: string;
}[] = [
  {
    id: "EXPLORER",
    name: "Skinny Pete",
    title: "The Explorer",
    quote: "\"I don't even know what I want to study, yo.\"",
    description: "You have interests but no clear course in mind. We'll run clarity sessions to surface courses and universities that actually fit you.",
  },
  {
    id: "STRATEGIST",
    name: "Jesse Pinkman",
    title: "The Strategist",
    quote: "\"Yeah, science! ...but like, which science?\"",
    description: "You know the rough direction. You need a plan: 5 smart choices, a strong PS, and strategic pivots if things shift.",
  },
  {
    id: "FINISHER",
    name: "Walter White",
    title: "The Finisher",
    quote: "\"I am the one who knocks.\"",
    description: "You're basically ready to submit. You need final checks: course fit, PS analysis, and honest offer chances before you lock it in.",
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  // Step 1: Name
  const [name, setName] = useState("");

  // Step 2: Curriculum + grades + HOME/INTL
  const [curriculum, setCurriculum] = useState<"IB" | "ALEVEL">("IB");
  const [homeOrIntl, setHomeOrIntl] = useState<"HOME" | "INTL">("INTL");

  // IB grades
  const [ibMode, setIbMode] = useState<"subjects" | "total">("total");
  const [ibSubjectTotal, setIbSubjectTotal] = useState<number | null>(null);
  const [ibBonusPoints, setIbBonusPoints] = useState<number | null>(null);
  const [ibTotalOnly, setIbTotalOnly] = useState<number | null>(null);
  const [showBonusFollowup, setShowBonusFollowup] = useState(false);
  const [knowsBonus, setKnowsBonus] = useState<boolean | null>(null);

  // A-Level grades
  const [alevelSummary, setAlevelSummary] = useState("");

  // Step 3: Interests
  const [interests, setInterests] = useState<string[]>([]);
  const [curiosity, setCuriosity] = useState("");

  // Step 4: Persona
  const [persona, setPersona] = useState<PersonaV2 | null>(null);

  const TOTAL = 4;
  const progress = (step / TOTAL) * 100;

  // Computed IB total
  const ibTotal = ibMode === "subjects"
    ? (ibSubjectTotal ?? 0) + (ibBonusPoints ?? 0)
    : ibTotalOnly ?? 0;

  const toggleInterest = (tag: string) => {
    setInterests((prev) =>
      prev.includes(tag)
        ? prev.filter((t) => t !== tag)
        : prev.length < 6
          ? [...prev, tag]
          : prev
    );
  };

  function canAdvance(): boolean {
    if (step === 1) return name.trim().length > 0;
    if (step === 2) {
      if (curriculum === "IB") {
        if (ibMode === "subjects") return ibSubjectTotal !== null && ibSubjectTotal >= 0;
        return ibTotalOnly !== null && ibTotalOnly >= 24;
      }
      return alevelSummary.trim().length > 0;
    }
    if (step === 3) return interests.length >= 3;
    if (step === 4) return persona !== null;
    return true;
  }

  async function finish() {
    if (!persona) return;
    setErr("");
    setSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Compute final IB values
      let finalSubjectTotal: number | null = null;
      let finalBonusPoints: number | null = null;
      let finalTotalPoints: number | null = null;
      let predictedSummary: string | null = null;

      if (curriculum === "IB") {
        if (ibMode === "subjects") {
          finalSubjectTotal = ibSubjectTotal;
          finalBonusPoints = ibBonusPoints;
          finalTotalPoints = (finalSubjectTotal ?? 0) + (finalBonusPoints ?? 0);
        } else {
          finalTotalPoints = ibTotalOnly;
          finalBonusPoints = knowsBonus ? ibBonusPoints : null;
          if (finalTotalPoints !== null && finalBonusPoints !== null) {
            finalSubjectTotal = finalTotalPoints - finalBonusPoints;
          }
        }
        predictedSummary = `IB ${finalTotalPoints ?? "?"}/45`;
      } else {
        predictedSummary = alevelSummary.trim();
      }

      const profileData = {
        user_id: user.id,
        name: name.trim(),
        persona,
        curriculum,
        home_or_intl: homeOrIntl,
        predicted_summary: predictedSummary,
        ib_subject_total: curriculum === "IB" ? finalSubjectTotal : null,
        ib_bonus_points: curriculum === "IB" ? finalBonusPoints : null,
        ib_total_points: curriculum === "IB" ? finalTotalPoints : null,
        alevel_predicted: curriculum === "ALEVEL" ? [{ summary: alevelSummary.trim() }] : null,
        interest_tags: interests,
        interests: interests.slice(0, 3), // compat with old column
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("profiles")
        .upsert(profileData, { onConflict: "user_id" });

      if (error) throw error;

      router.push("/my-space");
    } catch (e: any) {
      setErr(e?.message || "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grain-overlay min-h-screen flex flex-col items-center justify-center p-6 md:p-10 bg-[var(--bg)]">
      <div className="w-full max-w-[520px]">
        {/* Logo */}
        <span className="serif text-2xl font-normal italic text-[var(--t)] block mb-8">
          offr
        </span>

        {/* Progress bar */}
        <div className="h-[2px] bg-[var(--s3)] rounded-full mb-10 overflow-hidden">
          <div
            className="h-full bg-[var(--acc)] rounded-full transition-all duration-400 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* ── STEP 1: NAME ── */}
        {step === 1 && (
          <div className="fade-in">
            <span className="micro-label mb-4 block">Step 1 of {TOTAL}</span>
            <h1 className="headline mb-3">What&apos;s your name?</h1>
            <p className="body-text mb-8">We&apos;ll use this to personalise your experience.</p>

            <div
              className="rounded-[20px] border border-[var(--b-panel)] bg-[var(--s1)] p-6"
              style={{
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04), inset 0 -1px 0 rgba(0,0,0,0.3), var(--shadow-panel)",
              }}
            >
              <input
                className="inp"
                placeholder="First name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && canAdvance() && setStep(2)}
              />
            </div>
          </div>
        )}

        {/* ── STEP 2: CURRICULUM + GRADES + HOME/INTL ── */}
        {step === 2 && (
          <div className="fade-in">
            <span className="micro-label mb-4 block">Step 2 of {TOTAL}</span>
            <h1 className="headline mb-3">Your academics</h1>
            <p className="body-text mb-8">Curriculum, predicted grades, and student type.</p>

            <div
              className="rounded-[20px] border border-[var(--b-panel)] bg-[var(--s1)] p-6 flex flex-col gap-6"
              style={{
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04), inset 0 -1px 0 rgba(0,0,0,0.3), var(--shadow-panel)",
              }}
            >
              {/* Curriculum */}
              <div>
                <span className="micro-label mb-2 block">Curriculum</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurriculum("IB")}
                    className={`tog ${curriculum === "IB" ? "tog-active" : ""}`}
                  >
                    IB Diploma
                  </button>
                  <button
                    onClick={() => setCurriculum("ALEVEL")}
                    className={`tog ${curriculum === "ALEVEL" ? "tog-active" : ""}`}
                  >
                    A-Levels
                  </button>
                </div>
              </div>

              {/* Student type */}
              <div>
                <span className="micro-label mb-2 block">Student Type</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setHomeOrIntl("INTL")}
                    className={`tog ${homeOrIntl === "INTL" ? "tog-active" : ""}`}
                  >
                    International
                  </button>
                  <button
                    onClick={() => setHomeOrIntl("HOME")}
                    className={`tog ${homeOrIntl === "HOME" ? "tog-active" : ""}`}
                  >
                    UK / Home
                  </button>
                </div>
              </div>

              {/* IB Grades */}
              {curriculum === "IB" && (
                <div className="flex flex-col gap-4">
                  <div>
                    <span className="micro-label mb-2 block">Predicted Grades</span>
                    <div className="flex gap-2 mb-4">
                      <button
                        onClick={() => setIbMode("total")}
                        className={`tog ${ibMode === "total" ? "tog-active" : ""}`}
                      >
                        I know my total
                      </button>
                      <button
                        onClick={() => setIbMode("subjects")}
                        className={`tog ${ibMode === "subjects" ? "tog-active" : ""}`}
                      >
                        Subject breakdown
                      </button>
                    </div>
                  </div>

                  {ibMode === "total" ? (
                    <div className="flex flex-col gap-4">
                      <div>
                        <span className="micro-label mb-2 block">Total Predicted (24–45)</span>
                        <input
                          type="number"
                          className="inp"
                          min={24}
                          max={45}
                          placeholder="e.g. 38"
                          value={ibTotalOnly ?? ""}
                          onChange={(e) => {
                            const v = e.target.value ? parseInt(e.target.value) : null;
                            setIbTotalOnly(v);
                            if (v && v >= 24) setShowBonusFollowup(true);
                          }}
                        />
                      </div>

                      {showBonusFollowup && ibTotalOnly && ibTotalOnly >= 24 && (
                        <div className="fade-in">
                          <span className="micro-label mb-2 block">Do you know your bonus points (EE/TOK)?</span>
                          <div className="flex gap-2 mb-3">
                            <button
                              onClick={() => setKnowsBonus(true)}
                              className={`tog ${knowsBonus === true ? "tog-active" : ""}`}
                            >
                              Yes
                            </button>
                            <button
                              onClick={() => { setKnowsBonus(false); setIbBonusPoints(null); }}
                              className={`tog ${knowsBonus === false ? "tog-active" : ""}`}
                            >
                              Not sure
                            </button>
                          </div>
                          {knowsBonus && (
                            <div className="fade-in">
                              <span className="micro-label mb-2 block">Bonus Points (0–3)</span>
                              <select
                                className="inp"
                                value={ibBonusPoints ?? ""}
                                onChange={(e) => setIbBonusPoints(e.target.value ? parseInt(e.target.value) : null)}
                              >
                                <option value="">Select</option>
                                {[0, 1, 2, 3].map((n) => (
                                  <option key={n} value={n}>
                                    {n} point{n !== 1 ? "s" : ""}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>
                      )}

                      {ibTotalOnly && ibTotalOnly >= 24 && (
                        <div className="mt-1 font-mono text-xs text-[var(--t3)]">
                          Total: <span className="text-[var(--acc)] font-semibold">{ibTotalOnly}</span>/45
                          {knowsBonus && ibBonusPoints !== null && (
                            <span> (subjects: {ibTotalOnly - ibBonusPoints} + bonus: {ibBonusPoints})</span>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      <div>
                        <span className="micro-label mb-2 block">Subject Total (0–42)</span>
                        <input
                          type="number"
                          className="inp"
                          min={0}
                          max={42}
                          placeholder="e.g. 36"
                          value={ibSubjectTotal ?? ""}
                          onChange={(e) => setIbSubjectTotal(e.target.value ? parseInt(e.target.value) : null)}
                        />
                      </div>
                      <div>
                        <span className="micro-label mb-2 block">Bonus Points — EE/TOK (0–3)</span>
                        <select
                          className="inp"
                          value={ibBonusPoints ?? ""}
                          onChange={(e) => setIbBonusPoints(e.target.value ? parseInt(e.target.value) : null)}
                        >
                          <option value="">Select</option>
                          {[0, 1, 2, 3].map((n) => (
                            <option key={n} value={n}>
                              {n} point{n !== 1 ? "s" : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="font-mono text-xs text-[var(--t3)]">
                        Total: <span className="text-[var(--acc)] font-semibold">{ibTotal}</span>/45
                        {ibSubjectTotal !== null && (
                          <span> (subjects: {ibSubjectTotal} + bonus: {ibBonusPoints ?? 0})</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* A-Level Grades */}
              {curriculum === "ALEVEL" && (
                <div>
                  <span className="micro-label mb-2 block">Predicted Grades</span>
                  <input
                    className="inp"
                    placeholder="e.g. A*AA or Maths A*, Economics A, History A"
                    value={alevelSummary}
                    onChange={(e) => setAlevelSummary(e.target.value)}
                  />
                  <p className="font-mono text-[9px] text-[var(--t3)] mt-2 uppercase tracking-[0.1em]">
                    You can add detailed subject breakdowns later in your profile.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── STEP 3: INTERESTS ── */}
        {step === 3 && (
          <div className="fade-in">
            <span className="micro-label mb-4 block">Step 3 of {TOTAL}</span>
            <h1 className="headline mb-3">What interests you?</h1>
            <p className="body-text mb-8">
              Pick 3–6 tags. These power your recommendations.
            </p>

            <div
              className="rounded-[20px] border border-[var(--b-panel)] bg-[var(--s1)] p-6"
              style={{
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04), inset 0 -1px 0 rgba(0,0,0,0.3), var(--shadow-panel)",
              }}
            >
              <div className="flex flex-wrap gap-2 mb-6">
                {INTERESTS.map((tag) => {
                  const active = interests.includes(tag);
                  const maxed = interests.length >= 6 && !active;
                  return (
                    <button
                      key={tag}
                      onClick={() => toggleInterest(tag)}
                      disabled={maxed}
                      className={`
                        px-4 py-2 rounded-full
                        font-mono text-[10px] font-medium uppercase tracking-[0.1em]
                        transition-all duration-150 border
                        ${active
                          ? "border-[var(--acc-border)] bg-[var(--acc-dim)] text-[var(--acc)]"
                          : "border-[var(--b)] bg-transparent text-[var(--t3)] hover:border-[var(--b-strong)] hover:text-[var(--t2)]"
                        }
                        ${maxed ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}
                      `}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>

              <div className="font-mono text-[10px] text-[var(--t3)] uppercase tracking-[0.1em] mb-4">
                Selected: {interests.length}/6
                {interests.length < 3 && (
                  <span className="text-[var(--rch-t)]"> — pick at least 3</span>
                )}
              </div>

              <div>
                <span className="micro-label mb-2 block">Anything else? (optional)</span>
                <input
                  className="inp"
                  placeholder="e.g. I'm fascinated by behavioural economics and game theory"
                  value={curiosity}
                  onChange={(e) => setCuriosity(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 4: PERSONA (Breaking Bad) ── */}
        {step === 4 && (
          <div className="fade-in">
            <span className="micro-label mb-4 block">Step 4 of {TOTAL}</span>
            <h1 className="headline mb-3">Pick your mode</h1>
            <p className="body-text mb-8">
              This shapes your dashboard. You can switch anytime.
            </p>

            <div className="flex flex-col gap-4">
              {PERSONAS.map((p) => {
                const active = persona === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setPersona(p.id)}
                    className={`
                      w-full text-left rounded-[20px] border p-6
                      transition-all duration-200
                      ${active
                        ? "border-[var(--acc-border)] bg-[var(--s1)]"
                        : "border-[var(--b)] bg-[var(--s1)] hover:border-[var(--b-strong)]"
                      }
                    `}
                    style={{
                      boxShadow: active
                        ? "inset 0 1px 0 rgba(255,255,255,0.04), inset 0 -1px 0 rgba(0,0,0,0.3), 0 0 30px rgba(0,229,199,0.07)"
                        : "inset 0 1px 0 rgba(255,255,255,0.04), inset 0 -1px 0 rgba(0,0,0,0.3), var(--shadow-panel)",
                    }}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className={`
                          font-mono text-[10px] font-bold uppercase tracking-[0.14em]
                          ${active ? "text-[var(--acc)]" : "text-[var(--t3)]"}
                        `}>
                          {p.name}
                        </span>
                        <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--t3)]">
                          / {p.title}
                        </span>
                      </div>
                      {active && (
                        <span className="w-3 h-3 rounded-full bg-[var(--acc)]" />
                      )}
                    </div>

                    {/* Quote */}
                    <p className="serif text-lg italic text-[var(--t)] mb-3">
                      {p.quote}
                    </p>

                    {/* Description */}
                    <p className="text-sm text-[var(--t2)] leading-relaxed">
                      {p.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Error */}
        {err && (
          <div className="mt-4 px-4 py-3 rounded-xl bg-[var(--rch-bg)] border border-[var(--rch-b)]">
            <p className="font-mono text-[11px] text-[var(--rch-t)]">{err}</p>
          </div>
        )}

        {/* Navigation */}
        <div className="mt-8 flex items-center justify-between">
          <button
            onClick={() => setStep((p) => Math.max(1, p - 1))}
            disabled={step === 1 || saving}
            className={`
              py-3 px-5 rounded-xl
              border border-[var(--b-strong)] bg-transparent
              text-[var(--t2)]
              font-mono text-[10px] font-medium uppercase tracking-[0.1em]
              transition-all duration-150
              hover:border-[var(--acc-border)] hover:text-[var(--acc)]
              disabled:opacity-30 disabled:cursor-not-allowed
            `}
          >
            Back
          </button>

          {step < TOTAL ? (
            <button
              onClick={() => setStep((p) => p + 1)}
              disabled={!canAdvance() || saving}
              className="
                py-4 px-8 rounded-xl
                bg-[var(--acc)] text-[var(--t-inv)]
                font-mono text-xs font-bold uppercase tracking-[0.14em]
                transition-all duration-150
                hover:bg-[var(--acc-h)] hover:shadow-glow
                active:translate-y-[1px]
                disabled:opacity-40 disabled:cursor-not-allowed
              "
              style={{
                boxShadow: canAdvance()
                  ? "0 2px 12px rgba(0,229,199,0.15), inset 0 1px 0 rgba(255,255,255,0.2)"
                  : "none",
              }}
            >
              Continue
            </button>
          ) : (
            <button
              onClick={finish}
              disabled={!canAdvance() || saving}
              className="
                py-4 px-8 rounded-xl
                bg-[var(--acc)] text-[var(--t-inv)]
                font-mono text-xs font-bold uppercase tracking-[0.14em]
                transition-all duration-150
                hover:bg-[var(--acc-h)] hover:shadow-glow
                active:translate-y-[1px]
                disabled:opacity-40 disabled:cursor-not-allowed
              "
              style={{
                boxShadow: canAdvance() && !saving
                  ? "0 2px 12px rgba(0,229,199,0.15), inset 0 1px 0 rgba(255,255,255,0.2)"
                  : "none",
              }}
            >
              {saving ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-[var(--t-inv)] border-t-transparent rounded-full animate-spin inline-block" />
                  Saving
                </span>
              ) : (
                "Launch My Space"
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
