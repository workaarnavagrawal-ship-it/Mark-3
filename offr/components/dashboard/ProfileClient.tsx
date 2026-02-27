"use client";
import { useState } from "react";
import { upsertProfile, upsertSubjects } from "@/lib/profile";
import { ProfileSuggestionsPanel } from "./ProfileSuggestionsPanel";
import { ExtracurricularPicker } from "@/components/ui/ExtracurricularPicker";
import type { Profile, SubjectEntry } from "@/lib/types";

const INTERESTS = ["Economics","Law","Computer Science","Medicine","Engineering","Mathematics","History","Philosophy","Politics","Psychology","Business","Architecture","Biology","Chemistry","Physics","Literature","Art & Design","Music","Geography","Sociology","Education","Environmental Science"];
const IB_SUBJECTS = ["Math AA HL","Math AI HL","Math AA SL","Math AI SL","Economics","Business Management","History","Geography","Psychology","Philosophy","English A Lang & Lit","English A Literature","English B","Physics","Chemistry","Biology","Computer Science","French B","Spanish B","Spanish ab initio","French ab initio","Global Politics","Design Technology","Visual Arts","Theatre","Music"];
const AL_SUBJECTS = ["Mathematics","Further Mathematics","Economics","Business","History","Geography","Politics","Psychology","Sociology","Philosophy","English Literature","English Language","Physics","Chemistry","Biology","Computer Science","Art","Design & Technology","Media Studies","Law","Statistics"];
const IB_GRADES = [7,6,5,4,3,2,1];
const A_GRADES = ["A*","A","B","C","D","E"];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: "24px", background: "var(--s1)", border: "1px solid var(--b)", borderRadius: "var(--r)", marginBottom: "12px" }}>
      <p className="label" style={{ marginBottom: "20px" }}>{title}</p>
      {children}
    </div>
  );
}

export function ProfileClient({ profile, subjects }: { profile: Profile; subjects: SubjectEntry[] }) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState("");
  const [name, setName] = useState(profile.name);
  const [year, setYear] = useState(profile.year);
  const [homeOrIntl, setHomeOrIntl] = useState(profile.home_or_intl);
  const [interests, setInterests] = useState<string[]>(profile.interests || []);
  const [interestsText, setInterestsText] = useState(profile.interests_text || "");
  const [extracurriculars, setExtracurriculars] = useState<string[]>(profile.extracurriculars || []);
  const [corePoints, setCorePoints] = useState(profile.core_points || 2);
  const [psFormat, setPsFormat] = useState<"UCAS_3Q"|"LEGACY">(profile.ps_format || "UCAS_3Q");
  const [q1, setQ1] = useState(profile.ps_q1 || "");
  const [q2, setQ2] = useState(profile.ps_q2 || "");
  const [q3, setQ3] = useState(profile.ps_q3 || "");
  const [statement, setStatement] = useState(profile.ps_statement || "");
  const [hl, setHl] = useState<SubjectEntry[]>(subjects.filter(s => s.level === "HL").length > 0 ? subjects.filter(s => s.level === "HL") : [{subject:"Math AA HL",level:"HL",predicted_grade:"6"},{subject:"Economics",level:"HL",predicted_grade:"6"},{subject:"History",level:"HL",predicted_grade:"6"}]);
  const [sl, setSl] = useState<SubjectEntry[]>(subjects.filter(s => s.level === "SL").length > 0 ? subjects.filter(s => s.level === "SL") : [{subject:"English A Lang & Lit",level:"SL",predicted_grade:"6"},{subject:"Physics",level:"SL",predicted_grade:"6"},{subject:"Spanish B",level:"SL",predicted_grade:"6"}]);
  const [al, setAl] = useState<SubjectEntry[]>(subjects.filter(s => s.level === "A_LEVEL").length > 0 ? subjects.filter(s => s.level === "A_LEVEL") : [{subject:"Mathematics",level:"A_LEVEL",predicted_grade:"A*"},{subject:"Economics",level:"A_LEVEL",predicted_grade:"A"},{subject:"History",level:"A_LEVEL",predicted_grade:"A"}]);

  const toggleInterest = (i: string) => setInterests(p => p.includes(i) ? p.filter(x => x !== i) : p.length < 3 ? [...p, i] : p);

  const selS: React.CSSProperties = { background: "var(--s2)", border: "1px solid var(--b)", borderRadius: "var(--ri)", padding: "10px 12px", fontSize: "14px", color: "var(--t)", fontFamily: "var(--font-dm, var(--sans))", outline: "none", width: "100%" };

  function togStyle(active: boolean): React.CSSProperties {
    return { padding: "9px 16px", borderRadius: "var(--ri)", border: `1px solid ${active ? "var(--acc)" : "var(--b)"}`, fontSize: "13px", cursor: "pointer", transition: "all 150ms", background: active ? "var(--acc)" : "transparent", color: active ? "var(--t-inv)" : "var(--t3)", fontFamily: "var(--font-dm, var(--sans))" };
  }

  async function save() {
    setErr(""); setSaving(true); setSaved(false);
    try {
      const p = await upsertProfile({
        name, year, curriculum: profile.curriculum, home_or_intl: homeOrIntl,
        interests, core_points: corePoints,
        ps_format: psFormat, ps_q1: q1, ps_q2: q2, ps_q3: q3, ps_statement: statement,
        interests_text: interestsText.trim() || undefined,
        extracurriculars,
      });
      if (!p) throw new Error("Save failed");
      const subs = profile.curriculum === "IB" ? [...hl,...sl] : al;
      await upsertSubjects(p.id, subs);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) { setErr(e?.message || "An unexpected error occurred. Please try again."); }
    finally { setSaving(false); }
  }

  return (
    <div style={{ padding: "48px 52px", maxWidth: "680px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "40px" }}>
        <div>
          <p className="label" style={{ marginBottom: "10px" }}>Account</p>
          <h1 className="serif" style={{ fontSize: "44px", fontWeight: 400, color: "var(--t)", marginBottom: "8px", letterSpacing: "-0.02em" }}>My Profile</h1>
          <p style={{ fontSize: "14px", color: "var(--t3)", lineHeight: 1.65 }}>Your grades and PS pre-fill every assessment automatically.</p>
        </div>
        <button onClick={save} disabled={saving} className="btn btn-prim" style={{ flexShrink: 0, marginTop: "8px" }}>
          {saving ? "Saving…" : saved ? "✓ Saved" : "Save changes"}
        </button>
      </div>

      {err && <div style={{ marginBottom: "16px", padding: "12px 16px", background: "var(--rch-bg)", border: "1px solid var(--rch-b)", borderRadius: "var(--ri)" }}><p style={{ fontSize: "13px", color: "var(--rch-t)" }}>{err}</p></div>}

      <Section title="Basic info">
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <p className="label">Name</p>
            <input className="inp" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <p className="label">Year group</p>
            <div style={{ display: "flex", gap: "8px" }}>
              {(["11","12"] as const).map(y => <button key={y} onClick={() => setYear(y)} style={togStyle(year === y)}>Year {y}</button>)}
            </div>
          </div>
          <div>
            <p className="label">Student type</p>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={() => setHomeOrIntl("intl")} style={togStyle(homeOrIntl === "intl")}>International</button>
              <button onClick={() => setHomeOrIntl("home")} style={togStyle(homeOrIntl === "home")}>UK / Domestic</button>
            </div>
          </div>
        </div>
      </Section>

      <Section title="Interests (up to 3)">
        <div style={{ display: "flex", flexWrap: "wrap", gap: "7px", marginBottom: "20px" }}>
          {INTERESTS.map(i => {
            const active = interests.includes(i);
            const maxed = interests.length >= 3 && !active;
            return <button key={i} onClick={() => toggleInterest(i)} disabled={maxed} style={{ padding: "6px 14px", borderRadius: "9999px", border: `1px solid ${active ? "var(--acc)" : "var(--b)"}`, background: active ? "var(--acc)" : "transparent", color: active ? "var(--t-inv)" : "var(--t3)", fontSize: "12px", cursor: maxed ? "not-allowed" : "pointer", opacity: maxed ? 0.35 : 1, transition: "all 150ms", fontFamily: "var(--font-dm, var(--sans))" }}>{i}</button>;
          })}
        </div>
        <div>
          <p className="label">Tell us more — optional</p>
          <p style={{ fontSize: "12px", color: "var(--t3)", marginBottom: "8px", lineHeight: 1.6 }}>
            What topics or ideas genuinely excite you? Used to improve course suggestions and PS feedback.
          </p>
          <textarea
            value={interestsText}
            onChange={e => setInterestsText(e.target.value)}
            className="inp"
            style={{ minHeight: "80px", resize: "none" }}
            placeholder='e.g. "I love debating ethics and political theory. Recently got interested in behavioural economics…"'
          />
        </div>
      </Section>

      <Section title="Extracurriculars">
        <p style={{ fontSize: "12px", color: "var(--t3)", marginBottom: "14px", lineHeight: 1.6 }}>
          Helps tailor course suggestions and PS tips. Add your own if needed.
        </p>
        <ExtracurricularPicker value={extracurriculars} onChange={setExtracurriculars} variant="profile" />
      </Section>

      <Section title={profile.curriculum === "IB" ? "IB subjects & predicted grades" : "A-Level predicted grades"}>
        {profile.curriculum === "IB" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div>
              <p className="label">Core points (EE + TOK)</p>
              <select style={selS} value={corePoints} onChange={e => setCorePoints(Number(e.target.value))}>
                {[0,1,2,3].map(c => <option key={c} value={c}>{c} point{c !== 1 ? "s" : ""}</option>)}
              </select>
            </div>
            <div>
              <p className="label">HL subjects</p>
              {hl.map((row, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 80px", gap: "8px", marginBottom: "8px" }}>
                  <select style={selS} value={row.subject} onChange={e => setHl(p => p.map((x,idx) => idx===i ? {...x,subject:e.target.value} : x))}>{IB_SUBJECTS.map(s => <option key={s}>{s}</option>)}</select>
                  <select style={selS} value={row.predicted_grade} onChange={e => setHl(p => p.map((x,idx) => idx===i ? {...x,predicted_grade:e.target.value} : x))}>{IB_GRADES.map(g => <option key={g}>{g}</option>)}</select>
                </div>
              ))}
            </div>
            <div>
              <p className="label">SL subjects</p>
              {sl.map((row, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 80px", gap: "8px", marginBottom: "8px" }}>
                  <select style={selS} value={row.subject} onChange={e => setSl(p => p.map((x,idx) => idx===i ? {...x,subject:e.target.value} : x))}>{IB_SUBJECTS.map(s => <option key={s}>{s}</option>)}</select>
                  <select style={selS} value={row.predicted_grade} onChange={e => setSl(p => p.map((x,idx) => idx===i ? {...x,predicted_grade:e.target.value} : x))}>{IB_GRADES.map(g => <option key={g}>{g}</option>)}</select>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div>
            {al.map((row, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 80px", gap: "8px", marginBottom: "8px" }}>
                <select style={selS} value={row.subject} onChange={e => setAl(p => p.map((x,idx) => idx===i ? {...x,subject:e.target.value} : x))}>{AL_SUBJECTS.map(s => <option key={s}>{s}</option>)}</select>
                <select style={selS} value={row.predicted_grade} onChange={e => setAl(p => p.map((x,idx) => idx===i ? {...x,predicted_grade:e.target.value} : x))}>{A_GRADES.map(g => <option key={g}>{g}</option>)}</select>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Personal statement">
        <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
          <button onClick={() => setPsFormat("UCAS_3Q")} style={togStyle(psFormat === "UCAS_3Q")}>UCAS 3 questions</button>
          <button onClick={() => setPsFormat("LEGACY")} style={togStyle(psFormat === "LEGACY")}>Single text</button>
        </div>
        {psFormat === "UCAS_3Q" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {[{label:"Q1 — Why this course?",val:q1,set:setQ1},{label:"Q2 — Academic preparation",val:q2,set:setQ2},{label:"Q3 — Supercurricular & values",val:q3,set:setQ3}].map(({label,val,set}) => (
              <div key={label}>
                <p className="label">{label}</p>
                <textarea value={val} onChange={e => set(e.target.value)} className="inp" style={{ minHeight: "90px", resize: "none" }} />
              </div>
            ))}
          </div>
        ) : (
          <textarea value={statement} onChange={e => setStatement(e.target.value)} className="inp" style={{ minHeight: "180px", resize: "none" }} />
        )}
      </Section>

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px", marginBottom: "24px" }}>
        <button onClick={save} disabled={saving} className="btn btn-prim" style={{ padding: "13px 32px" }}>
          {saving ? "Saving…" : saved ? "✓ Saved!" : "Save changes"}
        </button>
      </div>

      {/* AI completeness + suggestions — non-blocking, additive */}
      <ProfileSuggestionsPanel request={{
        curriculum: profile.curriculum,
        year: String(profile.year),
        interests_count: interests.length,
        has_grades: profile.curriculum === "IB"
          ? hl.length > 0 || sl.length > 0
          : al.length > 0,
        has_ps: !!(q1.trim() || statement.trim()),
        ps_length: (psFormat === "UCAS_3Q" ? q1 + q2 + q3 : statement).length,
        ib_total: profile.curriculum === "IB"
          ? [...hl,...sl].reduce((s,x) => s + Number(x.predicted_grade), 0) + corePoints
          : null,
        a_level_count: profile.curriculum !== "IB" ? al.length : null,
      }} />
    </div>
  );
}
