import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function LandingPage({ searchParams }: { searchParams: { code?: string; token_hash?: string; type?: string } }) {
  if (searchParams.code) redirect(`/auth/callback?code=${searchParams.code}`);
  if (searchParams.token_hash && searchParams.type) redirect(`/auth/callback?token_hash=${searchParams.token_hash}&type=${searchParams.type}`);

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--bg)" }}>
      {/* Nav */}
      <nav style={{ padding: "28px 48px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--b)" }}>
        <span className="serif" style={{ fontSize: "22px", fontWeight: 400, fontStyle: "italic", letterSpacing: "-0.02em", color: "var(--t)" }}>offr</span>
        <Link href="/auth" style={{ fontSize: "13px", color: "var(--t3)", textDecoration: "none", transition: "color 150ms" }}
          onMouseEnter={undefined}>Sign in →</Link>
      </nav>

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
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", marginBottom: "32px", textAlign: "left" }}>
            {[
              { label: "I'm exploring", sub: "Not sure what to study yet", href: "/auth" },
              { label: "I have a plan", sub: "Need smarter options & strategy", href: "/auth" },
              { label: "I need real odds", sub: "Want honest chance predictions", href: "/auth" },
            ].map(item => (
              <Link key={item.label} href={item.href} style={{
                display: "block", padding: "18px 20px",
                background: "var(--s1)", border: "1px solid var(--b)",
                borderRadius: "var(--r)", textDecoration: "none",
                transition: "border-color 150ms, background 150ms",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--b-strong)"; (e.currentTarget as HTMLElement).style.background = "var(--s2)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--b)"; (e.currentTarget as HTMLElement).style.background = "var(--s1)"; }}>
                <p className="serif" style={{ fontSize: "17px", fontWeight: 400, color: "var(--t)", marginBottom: "4px" }}>{item.label}</p>
                <p style={{ fontSize: "12px", color: "var(--t3)" }}>{item.sub}</p>
              </Link>
            ))}
          </div>

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
