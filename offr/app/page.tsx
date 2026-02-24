import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { LandingNav } from "@/components/LandingNav";
import { PersonaCards } from "@/components/PersonaCards";

export default async function LandingPage({ searchParams }: { searchParams: { code?: string; token_hash?: string; type?: string } }) {
  if (searchParams.code) redirect(`/auth/callback?code=${searchParams.code}`);
  if (searchParams.token_hash && searchParams.type) redirect(`/auth/callback?token_hash=${searchParams.token_hash}&type=${searchParams.type}`);

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--bg)" }}>
      {/* Nav */}
      <LandingNav />

      {/* Hero */}
      <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "80px 24px" }}>
        <div style={{ maxWidth: "640px", width: "100%", textAlign: "center" }}>

          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", border: "1px solid var(--b)", borderRadius: "9999px", padding: "5px 14px", fontSize: "12px", color: "var(--t3)", marginBottom: "52px" }}>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--safe-t)", display: "inline-block", animation: "pulse 2s infinite" }} />
            Real 2024–25 applicant data · Free
          </div>

          <h1 className="serif" style={{ fontSize: "76px", fontWeight: 400, letterSpacing: "-0.03em", color: "var(--t)", lineHeight: 1, marginBottom: "32px", fontStyle: "italic" }}>
            Will you<br />get in?
          </h1>

          <p style={{ fontSize: "17px", color: "var(--t3)", lineHeight: 1.75, marginBottom: "52px", maxWidth: "440px", margin: "0 auto 52px" }}>
            Build your profile once. Get honest, explainable offer predictions for every UCAS choice.
          </p>

          {/* Persona intent cards */}
          <PersonaCards />

          <p style={{ fontSize: "12px", color: "var(--t3)" }}>All three paths start with your profile. Takes 2 minutes.</p>
        </div>
      </main>

      {/* Proof strip */}
      <div style={{ padding: "20px 48px", borderTop: "1px solid var(--b)", display: "flex", gap: "32px", justifyContent: "center" }}>
        {["4,000+ offer holders · 2024–25", "IB & A-Levels supported", "No credit card needed"].map(t => (
          <span key={t} style={{ fontSize: "12px", color: "var(--t3)" }}>{t}</span>
        ))}
      </div>
    </div>
  );
}
