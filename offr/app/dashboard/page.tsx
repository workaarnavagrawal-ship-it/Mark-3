import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { PersonaLinks } from "@/components/dashboard/PersonaLinks";

const BS: Record<string, any> = {
  Safe:   { bg: "var(--safe-bg)", color: "var(--safe-t)", border: "1px solid var(--safe-b)" },
  Target: { bg: "var(--tgt-bg)",  color: "var(--tgt-t)",  border: "1px solid var(--tgt-b)" },
  Reach:  { bg: "var(--rch-bg)",  color: "var(--rch-t)",  border: "1px solid var(--rch-b)" },
};

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");
  const { data: profile } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
  if (!profile) redirect("/onboarding");
  const { data: assessments } = await supabase.from("assessments").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5);
  const { data: subjects } = await supabase.from("subjects").select("*").eq("profile_id", profile.id);

  const ibTotal = subjects?.filter((s: any) => s.level !== "A_LEVEL").reduce((acc: number, x: any) => acc + Number(x.predicted_grade), 0) || 0;
  const ibScore = ibTotal + (profile.core_points || 0);

  const h = new Date().getHours();
  const greeting = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";

  const personaRoutes = [
    { href: "/dashboard/explore", label: "Explore paths", sub: "Discover courses that fit your interests", persona: "explorer" },
    { href: "/dashboard/strategy", label: "Build strategy", sub: "Compare options, find hidden gems", persona: "optimizer" },
    { href: "/dashboard/assess", label: "Check chances", sub: "Get honest, data-driven predictions", persona: "verifier" },
  ];

  return (
    <div style={{ padding: "48px 52px", maxWidth: "860px" }}>

      {/* Greeting */}
      <div style={{ marginBottom: "48px" }}>
        <p className="label" style={{ marginBottom: "10px" }}>{greeting}</p>
        <h1 className="serif" style={{ fontSize: "52px", fontWeight: 400, letterSpacing: "-0.025em", color: "var(--t)", lineHeight: 1.05, marginBottom: "12px" }}>
          {profile.name}
        </h1>
        <p style={{ color: "var(--t3)", fontSize: "13px" }}>
          Year {profile.year} · {profile.curriculum === "IB" ? "IB Diploma" : "A Levels"} · {profile.home_or_intl === "intl" ? "International" : "Domestic"}
        </p>
      </div>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", marginBottom: "10px" }}>
        <div className="card">
          <p className="label">{profile.curriculum === "IB" ? "Predicted score" : "Top grades"}</p>
          {profile.curriculum === "IB" ? (
            <>
              <p className="serif" style={{ fontSize: "46px", fontWeight: 400, color: "var(--t)", lineHeight: 1, marginBottom: "4px" }}>{ibScore}</p>
              <p style={{ fontSize: "12px", color: "var(--t3)" }}>of 45 points</p>
            </>
          ) : (
            <p className="serif" style={{ fontSize: "28px", color: "var(--t)", lineHeight: 1.2 }}>
              {subjects?.slice(0, 3).map((s: any) => s.predicted_grade).join(" · ") || "—"}
            </p>
          )}
        </div>
        <div className="card">
          <p className="label">Choices assessed</p>
          <p className="serif" style={{ fontSize: "46px", fontWeight: 400, color: "var(--t)", lineHeight: 1, marginBottom: "4px" }}>{assessments?.length || 0}</p>
          <p style={{ fontSize: "12px", color: "var(--t3)" }}>of 5 UCAS slots</p>
        </div>
        <div className="card">
          <p className="label">PS status</p>
          {(profile.ps_q1 || profile.ps_statement) ? (
            <>
              <p style={{ fontSize: "14px", color: "var(--safe-t)", marginBottom: "4px" }}>✓ Saved</p>
              <Link href="/dashboard/ps" style={{ fontSize: "12px", color: "var(--t3)", textDecoration: "none" }}>Analyse it →</Link>
            </>
          ) : (
            <>
              <p style={{ fontSize: "14px", color: "var(--t3)", marginBottom: "4px" }}>Not added yet</p>
              <Link href="/dashboard/profile" style={{ fontSize: "12px", color: "var(--t3)", textDecoration: "none" }}>Add PS →</Link>
            </>
          )}
        </div>
      </div>

      {/* Persona quick actions */}
      <PersonaLinks items={personaRoutes} />

      {/* Recent assessments */}
      {assessments && assessments.length > 0 && (
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
            <h3 className="serif" style={{ fontSize: "20px", fontWeight: 400, color: "var(--t)" }}>Recent assessments</h3>
            <Link href="/dashboard/tracker" style={{ fontSize: "13px", color: "var(--t3)", textDecoration: "none" }}>View tracker →</Link>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {assessments.map((a: any) => {
              const bs = BS[a.band] || BS.Reach;
              return (
                <div key={a.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", background: "var(--s1)", border: "1px solid var(--b)", borderRadius: "12px" }}>
                  <div>
                    <p style={{ fontSize: "14px", color: "var(--t)", fontWeight: 500, marginBottom: "2px" }}>{a.course_name}</p>
                    <p style={{ fontSize: "12px", color: "var(--t3)" }}>{a.university_name}</p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <span className="serif" style={{ fontSize: "22px", color: "var(--t)" }}>{a.chance_percent}%</span>
                    <span className="pill" style={{ background: bs.bg, color: bs.color, border: bs.border }}>{a.band}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
