import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { PersonaBadge } from "@/components/ui/PersonaBadge";
import { DashboardInsights } from "@/components/dashboard/DashboardInsights";
import type { DashboardInsightsRequest, PersonaCode } from "@/lib/types";

const BAND_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  Safe:   { bg: "var(--safe-bg)", color: "var(--safe-t)", border: "1px solid var(--safe-b)" },
  Target: { bg: "var(--tgt-bg)",  color: "var(--tgt-t)",  border: "1px solid var(--tgt-b)" },
  Reach:  { bg: "var(--rch-bg)",  color: "var(--rch-t)",  border: "1px solid var(--rch-b)" },
};

const PERSONA_CTA: Record<PersonaCode, { label: string; href: string; sub: string }> = {
  EXPLORER:   { label: "Explore the Database",     href: "/dashboard/explore",   sub: "Discover courses matched to your interests" },
  STRATEGIST: { label: "Build Your Strategy",      href: "/dashboard/strategy",  sub: "Fill your 5 UCAS slots with the right mix" },
  FINISHER:   { label: "Check Offer Chances",      href: "/dashboard/assess",    sub: "Get honest, data-driven predictions" },
};

export default async function MySpacePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  const { data: profile } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
  if (!profile) redirect("/onboarding");

  const [{ data: assessments }, { data: subjects }, { data: shortlistItems }, { data: strategySlots }] =
    await Promise.all([
      supabase.from("assessments").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
      supabase.from("subjects").select("*").eq("profile_id", profile.id),
      supabase.from("shortlist_items").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
      supabase.from("strategy_choices").select("*").eq("user_id", user.id).order("slot"),
    ]);

  // IB score: prefer new column, fall back to subject summation
  const ibTotal = profile.ib_total_points ??
    ((subjects?.filter((s: { level: string }) => s.level !== "A_LEVEL").reduce(
      (acc: number, x: { predicted_grade: string }) => acc + Number(x.predicted_grade), 0
    ) || 0) + (profile.core_points || 0));

  // Build insights request
  const bands: Record<string, number> = { Safe: 0, Target: 0, Reach: 0 };
  (assessments || []).forEach((a: { band: string }) => { if (a.band in bands) bands[a.band]++; });
  const insightsRequest: DashboardInsightsRequest = {
    curriculum: profile.curriculum,
    year: String(profile.year),
    interests: profile.interests || [],
    has_ps: !!(profile.ps_q1 || profile.ps_statement),
    has_subjects: !!(subjects && subjects.length > 0),
    assessments_count: assessments?.length || 0,
    bands,
    shortlisted_count: shortlistItems?.length || 0,
    ib_score: profile.curriculum === "IB" ? ibTotal || null : null,
    a_level_grades: profile.curriculum !== "IB"
      ? (subjects || []).slice(0, 4).map((s: { predicted_grade: string }) => s.predicted_grade)
      : null,
  };

  const persona: PersonaCode = (profile.persona as PersonaCode) || "FINISHER";
  const cta = PERSONA_CTA[persona];
  const h = new Date().getHours();
  const greeting = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  const filledSlots = (strategySlots || []).length;
  const hasSomeData = !!(assessments?.length || shortlistItems?.length || filledSlots > 0);

  return (
    <div style={{ padding: "48px 52px", maxWidth: 860 }}>

      {/* ── Greeting ── */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
          <p className="label">{greeting}</p>
          <PersonaBadge persona={persona} />
        </div>
        <h1 className="serif" style={{ fontSize: 52, fontWeight: 400, letterSpacing: "-0.025em", color: "var(--t)", lineHeight: 1.05, marginBottom: 10 }}>
          {profile.name}
        </h1>
        <p style={{ color: "var(--t3)", fontSize: 13 }}>
          Year {profile.year} · {profile.curriculum === "IB" ? "IB Diploma" : "A Levels"} · {
            (profile.home_or_intl || "").toUpperCase() === "INTL" || profile.home_or_intl === "intl"
              ? "International"
              : "UK / Domestic"
          }
        </p>
      </div>

      {/* ── Stats row ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 10 }}>
        {/* Score card */}
        <div className="card" style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {profile.curriculum === "IB" ? (
            <>
              <ProgressRing value={ibTotal} max={45} size={72} strokeWidth={5} sublabel="/ 45" />
              <div>
                <p className="label" style={{ marginBottom: 4 }}>Predicted score</p>
                <p style={{ fontSize: 12, color: "var(--t3)" }}>IB Diploma</p>
              </div>
            </>
          ) : (
            <div>
              <p className="label" style={{ marginBottom: 6 }}>Top grades</p>
              <p className="serif" style={{ fontSize: 28, color: "var(--t)", lineHeight: 1.2 }}>
                {subjects?.slice(0, 3).map((s: { predicted_grade: string }) => s.predicted_grade).join(" · ") || "—"}
              </p>
            </div>
          )}
        </div>

        {/* Strategy slots */}
        <div className="card">
          <p className="label" style={{ marginBottom: 6 }}>Strategy</p>
          <p className="serif" style={{ fontSize: 46, fontWeight: 400, color: "var(--t)", lineHeight: 1, marginBottom: 4 }}>{filledSlots}</p>
          <p style={{ fontSize: 12, color: "var(--t3)" }}>of 5 UCAS slots filled</p>
        </div>

        {/* PS status */}
        <div className="card">
          <p className="label" style={{ marginBottom: 6 }}>PS status</p>
          {(profile.ps_q1 || profile.ps_statement) ? (
            <>
              <p style={{ fontSize: 14, color: "var(--safe-t)", marginBottom: 4 }}>✓ Saved</p>
              <Link href="/dashboard/ps" style={{ fontSize: 12, color: "var(--t3)", textDecoration: "none" }}>Analyse it →</Link>
            </>
          ) : (
            <>
              <p style={{ fontSize: 14, color: "var(--t3)", marginBottom: 4 }}>Not added yet</p>
              <Link href="/dashboard/ps" style={{ fontSize: 12, color: "var(--t3)", textDecoration: "none" }}>Add PS →</Link>
            </>
          )}
        </div>
      </div>

      {/* ── AI Insights ── */}
      <DashboardInsights request={insightsRequest} />

      {/* ── Primary CTA (persona-specific) ── */}
      <Link
        href={cta.href}
        className="link-card"
        style={{
          display: "block",
          padding: "22px 28px",
          borderRadius: "var(--r)",
          textDecoration: "none",
          marginBottom: 10,
          borderColor: "var(--mono-card-b)",
          background: "var(--mono-card-bg)",
        }}
      >
        <p className="serif" style={{ fontSize: 20, fontWeight: 400, color: "var(--t)", marginBottom: 4 }}>
          {cta.label} →
        </p>
        <p style={{ fontSize: 13, color: "var(--t3)" }}>{cta.sub}</p>
      </Link>

      {/* ── Strategy slots (all personas) ── */}
      {(persona === "STRATEGIST" || persona === "FINISHER" || filledSlots > 0) && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <h3 className="serif" style={{ fontSize: 20, fontWeight: 400, color: "var(--t)" }}>My Strategy</h3>
            <Link href="/dashboard/strategy" style={{ fontSize: 13, color: "var(--t3)", textDecoration: "none" }}>Edit →</Link>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[1,2,3,4,5].map(slot => {
              const choice = (strategySlots || []).find((s: { slot: number }) => s.slot === slot);
              return (
                <div key={slot} style={{
                  display: "flex", alignItems: "center", gap: 16,
                  padding: "14px 20px",
                  background: choice ? "var(--s1)" : "var(--bg)",
                  border: `1px solid ${choice ? "var(--b)" : "var(--b)"}`,
                  borderRadius: 12, opacity: choice ? 1 : 0.5,
                }}>
                  <span style={{ fontSize: 12, color: "var(--t3)", minWidth: 16, textAlign: "center" }}>{slot}</span>
                  {choice ? (
                    <div>
                      <p style={{ fontSize: 14, color: "var(--t)", fontWeight: 500, marginBottom: 2 }}>{choice.course_name}</p>
                      <p style={{ fontSize: 12, color: "var(--t3)" }}>{choice.university_name}</p>
                    </div>
                  ) : (
                    <p style={{ fontSize: 13, color: "var(--t3)" }}>Empty slot — add from My Strategy</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Shortlist (EXPLORER + any persona with items) ── */}
      {(persona === "EXPLORER" || (shortlistItems && shortlistItems.length > 0)) && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <h3 className="serif" style={{ fontSize: 20, fontWeight: 400, color: "var(--t)" }}>Shortlisted</h3>
            <Link href="/dashboard/explore" style={{ fontSize: 13, color: "var(--t3)", textDecoration: "none" }}>Browse →</Link>
          </div>
          {shortlistItems && shortlistItems.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {shortlistItems.map((s: { id: string; course_name: string; university_name?: string; fit_score?: number }) => (
                <div key={s.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", background: "var(--s1)", border: "1px solid var(--b)", borderRadius: 12 }}>
                  <div>
                    <p style={{ fontSize: 14, color: "var(--t)", fontWeight: 500, marginBottom: 2 }}>{s.course_name}</p>
                    {s.university_name && <p style={{ fontSize: 12, color: "var(--t3)" }}>{s.university_name}</p>}
                  </div>
                  {s.fit_score != null && (
                    <span className={`pill ${s.fit_score >= 70 ? "fit-strong" : s.fit_score >= 45 ? "fit-ok" : "fit-low"}`} style={{ fontWeight: 600 }}>
                      {s.fit_score}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: "20px 24px", background: "var(--s1)", border: "1px solid var(--b)", borderRadius: 12 }}>
              <p style={{ fontSize: 13, color: "var(--t3)", marginBottom: 8 }}>No courses shortlisted yet.</p>
              <Link href="/dashboard/explore" style={{ fontSize: 13, color: "var(--t)", textDecoration: "none", borderBottom: "1px solid var(--b)" }}>
                Explore the database →
              </Link>
            </div>
          )}
        </div>
      )}

      {/* ── Recent assessments (FINISHER + others with assessments) ── */}
      {(persona === "FINISHER" || (assessments && assessments.length > 0)) && (
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <h3 className="serif" style={{ fontSize: 20, fontWeight: 400, color: "var(--t)" }}>Recent assessments</h3>
            <Link href="/dashboard/tracker" style={{ fontSize: 13, color: "var(--t3)", textDecoration: "none" }}>View tracker →</Link>
          </div>
          {assessments && assessments.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {assessments.map((a: { id: string; course_name: string; university_name: string; band: string; chance_percent: number }) => {
                const bs = BAND_STYLE[a.band] || BAND_STYLE.Reach;
                return (
                  <div key={a.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", background: "var(--s1)", border: "1px solid var(--b)", borderRadius: 12 }}>
                    <div>
                      <p style={{ fontSize: 14, color: "var(--t)", fontWeight: 500, marginBottom: 2 }}>{a.course_name}</p>
                      <p style={{ fontSize: 12, color: "var(--t3)" }}>{a.university_name}</p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span className="serif" style={{ fontSize: 22, color: "var(--t)" }}>{a.chance_percent}%</span>
                      <span className="pill" style={{ background: bs.bg, color: bs.color, border: bs.border }}>{a.band}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ padding: "20px 24px", background: "var(--s1)", border: "1px solid var(--b)", borderRadius: 12 }}>
              <p style={{ fontSize: 13, color: "var(--t3)", marginBottom: 8 }}>No assessments yet.</p>
              <Link href="/dashboard/assess" style={{ fontSize: 13, color: "var(--t)", textDecoration: "none", borderBottom: "1px solid var(--b)" }}>
                Check offer chances →
              </Link>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
