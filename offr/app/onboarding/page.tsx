"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { upsertProfile, upsertSubjects } from "@/lib/profile";
import { ExtracurricularPicker } from "@/components/ui/ExtracurricularPicker";
import type { Curriculum, HomeOrIntl, SubjectEntry, YearGroup, PersonaCode } from "@/lib/types";

const INTERESTS = [
  "Economics","Law","Computer Science","Medicine","Engineering","Mathematics",
  "History","Philosophy","Politics","Psychology","Business","Architecture",
  "Biology","Chemistry","Physics","Literature","Art & Design","Music",
  "Geography","Sociology","Environmental Science",
];
const IB_SUBJECTS = [
  "Math AA HL","Math AI HL","Math AA SL","Math AI SL","Economics",
  "Business Management","History","Geography","Psychology","Philosophy",
  "English A Lang & Lit","English A Literature","English B","Physics",
  "Chemistry","Biology","Computer Science","French B","Spanish B",
  "Spanish ab initio","French ab initio","Global Politics",
  "Design Technology","Visual Arts","Theatre","Music",
];
const AL_SUBJECTS = [
  "Mathematics","Further Mathematics","Economics","Business","History",
  "Geography","Politics","Psychology","Sociology","Philosophy",
  "English Literature","English Language","Physics","Chemistry","Biology",
  "Computer Science","Art","Design & Technology","Media Studies","Law","Statistics",
];
const IB_GRADES = [7,6,5,4,3,2,1];
const A_GRADES  = ["A*","A","B","C","D","E"];

const PERSONA_OPTIONS: { id: PersonaCode; label: string; sub: string }[] = [
  { id: "EXPLORER",   label: "I'm exploring",      sub: "Interests but no course in mind yet" },
  { id: "STRATEGIST", label: "I have a rough plan", sub: "Know roughly what I want; need smarter options" },
  { id: "FINISHER",   label: "I need honest odds",  sub: "Know what I'm applying for; need real chances" },
];

const PERSONA_ROUTE: Record<PersonaCode, string> = {
  EXPLORER:   "/dashboard",
  STRATEGIST: "/dashboard/strategy",
  FINISHER:   "/dashboard",
};

const TOTAL = 7;

function calcIbTotal(hl: SubjectEntry[], sl: SubjectEntry[], bonus: number): number {
  return [...hl, ...sl].reduce((acc, s) => acc + (Number(s.predicted_grade) || 0), 0) + bonus;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep]     = useState(1);
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState("");

  const [persona, setPersona]         = useState<PersonaCode>("EXPLORER");
  const [name, setName]               = useState("");
  const [year, setYear]               = useState<YearGroup>("12");
  const [curriculum, setCurriculum]   = useState<Curriculum>("IB");
  const [homeOrIntl, setHomeOrIntl]   = useState<HomeOrIntl>("INTL");
  const [bonusPoints, setBonusPoints] = useState(2);
  const [interests, setInterests]     = useState<string[]>([]);
  const [interestsText, setInterestsText] = useState("");
  const [extracurriculars, setExtracurriculars] = useState<string[]>([]);
  const [hl, setHl] = useState<SubjectEntry[]>([
    { subject: "Math AA HL",           level: "HL", predicted_grade: "6" },
    { subject: "Economics",            level: "HL", predicted_grade: "6" },
    { subject: "History",              level: "HL", predicted_grade: "6" },
  ]);
  const [sl, setSl] = useState<SubjectEntry[]>([
    { subject: "English A Lang & Lit", level: "SL", predicted_grade: "6" },
    { subject: "Physics",              level: "SL", predicted_grade: "6" },
    { subject: "Spanish B",            level: "SL", predicted_grade: "6" },
  ]);
  const [al, setAl] = useState<SubjectEntry[]>([
    { subject: "Mathematics", level: "A_LEVEL", predicted_grade: "A*" },
    { subject: "Economics",   level: "A_LEVEL", predicted_grade: "A" },
    { subject: "History",     level: "A_LEVEL", predicted_grade: "A" },
  ]);
  const [psFormat, setPsFormat] = useState<"UCAS_3Q"|"LEGACY">("UCAS_3Q");
  const [q1, setQ1] = useState(""); const [q2, setQ2] = useState(""); const [q3, setQ3] = useState("");
  const [statement, setStatement] = useState("");

  const toggleInterest = (i: string) =>
    setInterests(p => p.includes(i) ? p.filter(x => x !== i) : p.length < 3 ? [...p, i] : p);

  const progress = (step / TOTAL) * 100;

  const sel: React.CSSProperties = {
    background: "var(--s2)", border: "1px solid var(--b)", borderRadius: "var(--ri)",
    padding: "11px 14px", fontSize: 14, color: "var(--t)",
    fontFamily: "var(--font-dm, var(--sans))", outline: "none", width: "100%",
  };

  function tog(active: boolean): React.CSSProperties {
    return {
      padding: "10px 18px", borderRadius: "var(--ri)",
      border: `1px solid ${active ? "var(--acc)" : "var(--b)"}`,
      fontSize: 14, cursor: "pointer", transition: "all 150ms",
      background: active ? "var(--acc)" : "transparent",
      color: active ? "var(--t-inv)" : "var(--t3)",
      fontFamily: "var(--font-dm, var(--sans))", fontWeight: active ? 500 : 400,
    };
  }

  async function finish() {
    setErr(""); setSaving(true);
    try {
      const subjects = curriculum === "IB" ? [...hl, ...sl] : al;
      const ibSubjectTotal = curriculum === "IB"
        ? [...hl, ...sl].reduce((acc, s) => acc + (Number(s.predicted_grade) || 0), 0)
        : null;
      const ibTotalPts = ibSubjectTotal != null ? ibSubjectTotal + bonusPoints : null;
      const aLevelPredicted = curriculum === "A_LEVELS"
        ? Object.fromEntries(al.map(s => [s.subject, s.predicted_grade]))
        : null;

      const profile = await upsertProfile({
        name, year, curriculum,
        home_or_intl: homeOrIntl,
        persona,
        ib_subject_total:  ibSubjectTotal,
        ib_bonus_points:   curriculum === "IB" ? bonusPoints : null,
        ib_total_points:   ibTotalPts,
        alevel_predicted:  aLevelPredicted,
        interests,
        interest_tags:     interests,
        interests_text:    interestsText.trim() || undefined,
        extracurriculars,
        core_points:       curriculum === "IB" ? bonusPoints : undefined,
        ps_format: psFormat,
        ps_q1: q1 || undefined, ps_q2: q2 || undefined, ps_q3: q3 || undefined,
        ps_statement: statement || undefined,
      });
      if (!profile) throw new Error("Failed to save profile");
      await upsertSubjects(profile.id, subjects);
      router.push(PERSONA_ROUTE[persona]);
    } catch (e: unknown) {
      setErr((e as Error)?.message || "An unexpected error occurred. Please try again.");
    } finally { setSaving(false); }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px", background: "var(--bg)" }}>
      <div style={{ width: "100%", maxWidth: 520 }}>
        <div className="serif" style={{ fontSize: 22, fontStyle: "italic", marginBottom: 32, color: "var(--t)" }}>offr</div>

        {/* Progress bar */}
        <div style={{ height: 2, background: "var(--s3)", borderRadius: 2, marginBottom: 36, overflow: "hidden" }}>
          <div style={{ height: "100%", background: "var(--acc)", borderRadius: 2, width: `${progress}%`, transition: "width 400ms ease" }} />
        </div>

        {/* Step 1 — Persona */}
        {step === 1 && (
          <div className="fade-in">
            <p className="label">Step 1 of {TOTAL}</p>
            <h1 className="serif" style={{ fontSize: 36, fontWeight: 400, color: "var(--t)", marginBottom: 10 }}>What do you need?</h1>
            <p style={{ fontSize: 14, color: "var(--t3)", marginBottom: 32, lineHeight: 1.65 }}>We&apos;ll shape your experience around this.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {PERSONA_OPTIONS.map(opt => (
                <button key={opt.id} onClick={() => setPersona(opt.id)} style={{
                  ...tog(persona === opt.id), display: "flex", flexDirection: "column",
                  alignItems: "flex-start", padding: "16px 20px", textAlign: "left", width: "100%",
                }}>
                  <span style={{ fontSize: 15, fontWeight: 500, marginBottom: 2 }}>{opt.label}</span>
                  <span style={{ fontSize: 12, opacity: 0.7, fontWeight: 400 }}>{opt.sub}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2 — Name */}
        {step === 2 && (
          <div className="fade-in">
            <p className="label">Step 2 of {TOTAL}</p>
            <h1 className="serif" style={{ fontSize: 36, fontWeight: 400, color: "var(--t)", marginBottom: 32 }}>What&apos;s your name?</h1>
            <input className="inp" placeholder="First name" value={name} onChange={e => setName(e.target.value)} autoFocus
              onKeyDown={e => e.key === "Enter" && name.trim() && setStep(3)} />
          </div>
        )}

        {/* Step 3 — Situation */}
        {step === 3 && (
          <div className="fade-in">
            <p className="label">Step 3 of {TOTAL}</p>
            <h1 className="serif" style={{ fontSize: 36, fontWeight: 400, color: "var(--t)", marginBottom: 32 }}>Your situation</h1>
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div>
                <p className="label">Year group</p>
                <div style={{ display: "flex", gap: 10 }}>
                  {(["11","12"] as YearGroup[]).map(y => <button key={y} onClick={() => setYear(y)} style={tog(year === y)}>Year {y}</button>)}
                </div>
              </div>
              <div>
                <p className="label">Curriculum</p>
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => setCurriculum("IB")} style={tog(curriculum === "IB")}>IB Diploma</button>
                  <button onClick={() => setCurriculum("A_LEVELS")} style={tog(curriculum === "A_LEVELS")}>A Levels</button>
                </div>
              </div>
              <div>
                <p className="label">Student type</p>
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => setHomeOrIntl("INTL")} style={tog(homeOrIntl === "INTL" || homeOrIntl === "intl")}>International</button>
                  <button onClick={() => setHomeOrIntl("HOME")} style={tog(homeOrIntl === "HOME" || homeOrIntl === "home")}>UK / Domestic</button>
                </div>
              </div>
              {curriculum === "IB" && (
                <div>
                  <p className="label">Core points (EE + TOK)</p>
                  <select style={sel} value={bonusPoints} onChange={e => setBonusPoints(Number(e.target.value))}>
                    {[0,1,2,3].map(c => <option key={c} value={c}>{c} point{c !== 1 ? "s" : ""}</option>)}
                  </select>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 4 — Interests */}
        {step === 4 && (
          <div className="fade-in">
            <p className="label">Step 4 of {TOTAL}</p>
            <h1 className="serif" style={{ fontSize: 36, fontWeight: 400, color: "var(--t)", marginBottom: 8 }}>Interests</h1>
            <p style={{ fontSize: 14, color: "var(--t3)", marginBottom: 24, lineHeight: 1.65 }}>Pick up to 3 to personalise your course recommendations.</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {INTERESTS.map(i => {
                const active = interests.includes(i);
                const maxed  = interests.length >= 3 && !active;
                return (
                  <button key={i} onClick={() => toggleInterest(i)} disabled={maxed} style={{
                    padding: "7px 14px", borderRadius: "9999px",
                    border: `1px solid ${active ? "var(--acc)" : "var(--b)"}`,
                    background: active ? "var(--acc)" : "transparent",
                    color: active ? "var(--t-inv)" : "var(--t3)",
                    fontSize: 13, cursor: maxed ? "not-allowed" : "pointer",
                    opacity: maxed ? 0.35 : 1, transition: "all 150ms",
                    fontFamily: "var(--font-dm, var(--sans))",
                  }}>{i}</button>
                );
              })}
            </div>
            <div style={{ marginTop: 28 }}>
              <p className="label">Tell us more — optional</p>
              <textarea value={interestsText} onChange={e => setInterestsText(e.target.value)}
                style={{ ...sel, minHeight: 88, resize: "none" }}
                placeholder='e.g. "I love debating ethics and political theory…"' />
            </div>
          </div>
        )}

        {/* Step 5 — Extracurriculars */}
        {step === 5 && (
          <div className="fade-in">
            <p className="label">Step 5 of {TOTAL}</p>
            <h1 className="serif" style={{ fontSize: 36, fontWeight: 400, color: "var(--t)", marginBottom: 8 }}>What do you get up to?</h1>
            <p style={{ fontSize: 14, color: "var(--t3)", marginBottom: 24, lineHeight: 1.65 }}>
              Helps tailor course suggestions and PS tips. Skip if unsure — editable in Profile.
            </p>
            <ExtracurricularPicker value={extracurriculars} onChange={setExtracurriculars} variant="onboarding" />
          </div>
        )}

        {/* Step 6 — Grades */}
        {step === 6 && (
          <div className="fade-in">
            <p className="label">Step 6 of {TOTAL}</p>
            <h1 className="serif" style={{ fontSize: 36, fontWeight: 400, color: "var(--t)", marginBottom: 8 }}>Predicted grades</h1>
            <p style={{ fontSize: 14, color: "var(--t3)", marginBottom: 24 }}>
              Pre-fills every assessment automatically.
              {curriculum === "IB" && <> Predicted total: <strong style={{ color: "var(--acc)" }}>{calcIbTotal(hl, sl, bonusPoints)} / 45</strong></>}
            </p>
            {curriculum === "IB" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {[
                  { label: "HL subjects", rows: hl, setRows: setHl },
                  { label: "SL subjects", rows: sl, setRows: setSl },
                ].map(({ label, rows, setRows }) => (
                  <div key={label}>
                    <p className="label">{label}</p>
                    {rows.map((row, i) => (
                      <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 80px", gap: 8, marginBottom: 8 }}>
                        <select style={sel} value={row.subject} onChange={e => setRows(p => p.map((x,idx) => idx===i ? {...x, subject: e.target.value} : x))}>
                          {IB_SUBJECTS.map(sub => <option key={sub}>{sub}</option>)}
                        </select>
                        <select style={sel} value={row.predicted_grade} onChange={e => setRows(p => p.map((x,idx) => idx===i ? {...x, predicted_grade: e.target.value} : x))}>
                          {IB_GRADES.map(g => <option key={g}>{g}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <div>
                <p className="label">A Level grades</p>
                {al.map((row, i) => (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 80px", gap: 8, marginBottom: 8 }}>
                    <select style={sel} value={row.subject} onChange={e => setAl(p => p.map((x,idx) => idx===i ? {...x, subject: e.target.value} : x))}>
                      {AL_SUBJECTS.map(sub => <option key={sub}>{sub}</option>)}
                    </select>
                    <select style={sel} value={row.predicted_grade} onChange={e => setAl(p => p.map((x,idx) => idx===i ? {...x, predicted_grade: e.target.value} : x))}>
                      {A_GRADES.map(g => <option key={g}>{g}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 7 — PS */}
        {step === 7 && (
          <div className="fade-in">
            <p className="label">Step 7 of {TOTAL}</p>
            <h1 className="serif" style={{ fontSize: 36, fontWeight: 400, color: "var(--t)", marginBottom: 8 }}>Personal statement</h1>
            <p style={{ fontSize: 14, color: "var(--t3)", marginBottom: 24, lineHeight: 1.65 }}>Optional — improves accuracy. Add later in Your PS.</p>
            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
              <button onClick={() => setPsFormat("UCAS_3Q")} style={tog(psFormat === "UCAS_3Q")}>UCAS 3 questions</button>
              <button onClick={() => setPsFormat("LEGACY")} style={tog(psFormat === "LEGACY")}>Single text</button>
            </div>
            {psFormat === "UCAS_3Q" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {[{label:"Q1 — Why this course?",val:q1,set:setQ1},{label:"Q2 — Academic preparation",val:q2,set:setQ2},{label:"Q3 — Supercurricular & values",val:q3,set:setQ3}].map(({label,val,set}) => (
                  <div key={label}>
                    <p className="label">{label}</p>
                    <textarea value={val} onChange={e => set(e.target.value)} style={{...sel, minHeight: 80, resize: "none"}} placeholder="Optional" />
                  </div>
                ))}
              </div>
            ) : (
              <textarea value={statement} onChange={e => setStatement(e.target.value)} style={{...sel, minHeight: 160, resize: "none"}} placeholder="Paste your personal statement here" />
            )}
          </div>
        )}

        {err && <p style={{ marginTop: 16, fontSize: 13, color: "var(--rch-t)" }}>{err}</p>}

        {/* Navigation */}
        <div style={{ marginTop: 32, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button onClick={() => setStep(p => Math.max(1, p-1))} disabled={step === 1 || saving}
            className="btn btn-ghost" style={{ opacity: step === 1 ? 0.3 : 1 }}>← Back</button>
          {step < TOTAL ? (
            <button onClick={() => setStep(p => p + 1)} disabled={(step === 2 && !name.trim()) || saving} className="btn btn-prim">
              Continue →
            </button>
          ) : (
            <button onClick={finish} disabled={saving} className="btn btn-prim">
              {saving ? "Saving…" : "Build my dashboard →"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
