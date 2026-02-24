"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getCourseDetail, getCourses, getUniversities, postOfferAssess } from "@/lib/api";
import { saveAssessment } from "@/lib/storage";
import { saveTrackerEntry } from "@/lib/profile";
import type { CourseListItem, OfferAssessRequest, Profile, SubjectEntry, UniversityItem } from "@/lib/types";

function norm(s: string) { return (s||"").toLowerCase().replace(/&/g,"and").replace(/[^a-z0-9\s]/g," ").replace(/\s+/g," ").trim(); }
function scoreMatch(q: string, n: string) {
  const qn = norm(q), nn = norm(n);
  if (!qn) return 0;
  if (nn === qn) return 100;
  if (nn.startsWith(qn)) return 80;
  if (nn.includes(qn)) return 60;
  const qt = qn.split(" "), nt = new Set(nn.split(" "));
  return qt.filter(t => t && nt.has(t)).length * 8;
}

const dDown: React.CSSProperties = { position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "var(--s2)", border: "1px solid var(--b)", borderRadius: "var(--ri)", zIndex: 20, maxHeight: "240px", overflowY: "auto", boxShadow: "0 8px 32px rgba(0,0,0,0.5)" };

export function AssessClient({ profile, subjects }: { profile: Profile; subjects: SubjectEntry[] }) {
  const router = useRouter();
  const [universities, setUniversities] = useState<UniversityItem[]>([]);
  const [courses, setCourses] = useState<CourseListItem[]>([]);
  const [universityId, setUniversityId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [courseQuery, setCourseQuery] = useState("");
  const [showCourses, setShowCourses] = useState(false);
  const [uniOpen, setUniOpen] = useState(false);
  const [uniSearch, setUniSearch] = useState("");
  const [courseDetail, setCourseDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");
  const uniRef = useRef<HTMLDivElement>(null);
  const courseRef = useRef<HTMLDivElement>(null);

  const hl = subjects.filter(s => s.level === "HL");
  const sl = subjects.filter(s => s.level === "SL");
  const al = subjects.filter(s => s.level === "A_LEVEL");

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (!uniRef.current?.contains(e.target as Node)) setUniOpen(false);
      if (!courseRef.current?.contains(e.target as Node)) setShowCourses(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => {
    getUniversities().then(u => { setUniversities(u); setUniversityId(u[0]?.university_id || ""); }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!universityId) return;
    setLoading(true); setCourseId(""); setCourseQuery("");
    getCourses(universityId).then(c => { setCourses(c); setLoading(false); }).catch(() => setLoading(false));
  }, [universityId]);

  useEffect(() => {
    if (!courseId) { setCourseDetail(null); return; }
    getCourseDetail(courseId).then(setCourseDetail).catch(() => {});
  }, [courseId]);

  const filteredUnis = useMemo(() => universities.filter(u => !uniSearch || u.university_name.toLowerCase().includes(uniSearch.toLowerCase())), [universities, uniSearch]);
  const suggestions = useMemo(() => courses.map(c => ({ c, s: scoreMatch(courseQuery, c.course_name) })).filter(x => courseQuery ? x.s > 0 : true).sort((a,b) => b.s-a.s).slice(0, 10).map(x => x.c), [courses, courseQuery]);
  const selectedUni = universities.find(u => u.university_id === universityId);

  async function submit() {
    if (!courseId) { setErr("Please select a course first"); return; }
    setErr(""); setSubmitting(true);
    try {
      const payload: OfferAssessRequest = {
        course_id: courseId, home_or_intl: profile.home_or_intl, curriculum: profile.curriculum,
        ps: (profile.ps_q1 || profile.ps_q2 || profile.ps_q3 || profile.ps_statement) ? {
          format: profile.ps_format || "UCAS_3Q", q1: profile.ps_q1, q2: profile.ps_q2, q3: profile.ps_q3, statement: profile.ps_statement,
        } : null,
      };
      if (profile.curriculum === "IB") {
        const total = [...hl,...sl].reduce((s,x) => s + Number(x.predicted_grade), 0) + (profile.core_points || 0);
        payload.ib = { core_points: profile.core_points || 0, hl: hl.map(x => ({ subject: x.subject, grade: Number(x.predicted_grade) })), sl: sl.map(x => ({ subject: x.subject, grade: Number(x.predicted_grade) })), total_points: total };
      } else {
        payload.a_levels = { predicted: al.map(x => ({ subject: x.subject, grade: x.predicted_grade })) };
      }
      const res = await postOfferAssess(payload);
      saveAssessment(res);
      await saveTrackerEntry({ user_id: profile.user_id, course_id: courseId, course_name: res.course.course_name || courseQuery, university_id: universityId, university_name: selectedUni?.university_name || universityId, band: res.band, chance_percent: res.chance_percent, result_json: res });
      router.push("/dashboard/result");
    } catch (e: any) { setErr(e.message || "Assessment failed"); }
    finally { setSubmitting(false); }
  }

  return (
    <div style={{ padding: "48px 52px", maxWidth: "640px" }}>
      <div style={{ marginBottom: "40px" }}>
        <p className="label" style={{ marginBottom: "10px" }}>Offer Chances</p>
        <h1 className="serif" style={{ fontSize: "44px", fontWeight: 400, color: "var(--t)", marginBottom: "10px", letterSpacing: "-0.02em" }}>Check your chances</h1>
        <p style={{ fontSize: "14px", color: "var(--t3)", lineHeight: 1.65 }}>Your profile is loaded. Pick a university and course to get a prediction.</p>
      </div>

      {/* Profile summary */}
      <div style={{ padding: "16px 20px", background: "var(--s1)", border: "1px solid var(--b)", borderRadius: "var(--ri)", marginBottom: "28px" }}>
        <p className="label" style={{ marginBottom: "10px" }}>Using your profile</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", fontSize: "13px", color: "var(--t3)" }}>
          <span>{profile.curriculum === "IB" ? "IB Diploma" : "A Levels"}</span>
          <span>·</span>
          <span>{profile.home_or_intl === "intl" ? "International" : "Domestic"}</span>
          {profile.curriculum === "IB" && <><span>·</span><span>{[...hl,...sl].reduce((s,x) => s+Number(x.predicted_grade),0) + (profile.core_points||0)} pts predicted</span></>}
          {profile.curriculum === "A_LEVELS" && <><span>·</span><span>{al.map(s => s.predicted_grade).join(", ")}</span></>}
          <span>·</span>
          <span style={{ color: (profile.ps_q1||profile.ps_statement) ? "var(--safe-t)" : "var(--t3)" }}>
            {(profile.ps_q1||profile.ps_statement) ? "✓ PS included" : "No PS saved"}
          </span>
        </div>
      </div>

      {/* University */}
      <div style={{ marginBottom: "16px", position: "relative" }} ref={uniRef}>
        <p className="label">University</p>
        <button onClick={() => setUniOpen(v => !v)} style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "11px 14px", background: "var(--s2)", border: "1px solid var(--b)",
          borderRadius: "var(--ri)", color: "var(--t)", fontSize: "14px",
          cursor: "pointer", fontFamily: "var(--font-dm, var(--sans))", transition: "border-color 150ms",
        }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "var(--b-strong)"}
        onMouseLeave={e => { if (!uniOpen) (e.currentTarget as HTMLElement).style.borderColor = "var(--b)"; }}>
          <span>{selectedUni?.university_name || "Select a university"}</span>
          <span style={{ color: "var(--t3)", transform: uniOpen ? "rotate(180deg)" : "none", transition: "transform 150ms" }}>▾</span>
        </button>
        {uniOpen && (
          <div style={dDown}>
            <div style={{ padding: "8px", borderBottom: "1px solid var(--b)" }}>
              <input className="inp" placeholder="Search…" value={uniSearch} onChange={e => setUniSearch(e.target.value)} autoFocus style={{ fontSize: "13px", padding: "8px 12px" }} />
            </div>
            {filteredUnis.map(u => (
              <button key={u.university_id} onClick={() => { setUniversityId(u.university_id); setUniOpen(false); setUniSearch(""); }}
                style={{ width: "100%", textAlign: "left", padding: "11px 14px", background: u.university_id === universityId ? "var(--s3)" : "transparent", border: "none", color: "var(--t)", fontSize: "13px", cursor: "pointer", fontFamily: "var(--font-dm, var(--sans))", transition: "background 100ms" }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--s3)"}
                onMouseLeave={e => { if (u.university_id !== universityId) (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                {u.university_name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Course */}
      <div style={{ marginBottom: "24px", position: "relative" }} ref={courseRef}>
        <p className="label">Course</p>
        <input className="inp" placeholder={loading ? "Loading courses…" : "Search — e.g. economics, law, computer science…"} value={courseQuery}
          onChange={e => { setCourseQuery(e.target.value); setCourseId(""); setShowCourses(true); }}
          onFocus={() => setShowCourses(true)} />
        {showCourses && suggestions.length > 0 && (
          <div style={dDown}>
            {suggestions.map(c => (
              <button key={c.course_id} onClick={() => { setCourseId(c.course_id); setCourseQuery(c.course_name); setShowCourses(false); }}
                style={{ width: "100%", textAlign: "left", padding: "11px 14px", background: c.course_id === courseId ? "var(--s3)" : "transparent", border: "none", borderBottom: "1px solid var(--b)", color: "var(--t)", fontSize: "13px", cursor: "pointer", fontFamily: "var(--font-dm, var(--sans))", transition: "background 100ms" }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--s3)"}
                onMouseLeave={e => { if (c.course_id !== courseId) (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                <div style={{ marginBottom: "2px" }}>{c.course_name}</div>
                <div style={{ fontSize: "11px", color: "var(--t3)" }}>{c.faculty}</div>
              </button>
            ))}
          </div>
        )}
        {courseDetail?.typical_offer && (
          <div style={{ marginTop: "8px", padding: "10px 14px", background: "var(--s1)", border: "1px solid var(--b)", borderRadius: "8px", fontSize: "13px", color: "var(--t3)" }}>
            Typical offer: <span style={{ color: "var(--t2)" }}>{courseDetail.typical_offer}</span>
          </div>
        )}
      </div>

      {err && <p style={{ marginBottom: "16px", fontSize: "13px", color: "var(--rch-t)", padding: "10px 14px", background: "var(--rch-bg)", border: "1px solid var(--rch-b)", borderRadius: "8px" }}>{err}</p>}

      <button onClick={submit} disabled={!courseId || submitting} className="btn btn-prim" style={{ width: "100%", padding: "14px", fontSize: "15px" }}>
        {submitting ? (
          <><span style={{ width: "16px", height: "16px", border: "1.5px solid rgba(26,24,21,0.3)", borderTopColor: "var(--t-inv)", borderRadius: "50%", display: "inline-block", animation: "spin 0.8s linear infinite" }} /> Analysing…</>
        ) : "Get my prediction →"}
      </button>
    </div>
  );
}
