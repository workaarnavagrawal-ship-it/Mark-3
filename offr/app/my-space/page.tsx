import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { DEMO_PROFILE } from "@/lib/demo";
import type { PersonaV2, ProfileV2 } from "@/lib/types";

/* ── Band pill styles ─────────────────────────────────────────── */

const BAND_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  Safe:   { bg: "var(--safe-bg)", color: "var(--safe-t)", border: "1px solid var(--safe-b)" },
  Target: { bg: "var(--tgt-bg)", color: "var(--tgt-t)", border: "1px solid var(--tgt-b)" },
  Reach:  { bg: "var(--rch-bg)", color: "var(--rch-t)", border: "1px solid var(--rch-b)" },
};

/* ── Persona CTA config ───────────────────────────────────────── */

const PERSONA_CTA: Record<PersonaV2, { label: string; sub: string; href: string }> = {
  EXPLORER:   { label: "Run a clarity session", sub: "Surface courses that match your interests", href: "/my-space/explore" },
  STRATEGIST: { label: "Build your strategy",   sub: "Plan your 5 UCAS choices and PS angle",    href: "/my-space/strategy" },
  FINISHER:   { label: "Check your chances",    sub: "Get honest offer predictions before you submit", href: "/my-space/assess" },
};

/* ── Quick-action cards (always shown) ────────────────────────── */

const QUICK_ACTIONS = [
  { href: "/my-space/explore",  label: "Explore",  sub: "Discover courses" },
  { href: "/my-space/strategy", label: "Strategy", sub: "Plan your 5 choices" },
  { href: "/my-space/assess",   label: "Assess",   sub: "Offer predictions" },
];

export default async function MySpacePage() {
  let p: ProfileV2 = DEMO_PROFILE;
  let assessments: any[] = [];
  let shortlisted: any[] = [];

  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();
      if (profile?.persona) p = profile as ProfileV2;

      const { data: a } = await supabase
        .from("assessments")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);
      assessments = a || [];

      const { data: s } = await supabase
        .from("shortlisted_courses")
        .select("course_key, course_name, universities_count")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);
      shortlisted = s || [];
    }
  } catch {
    // No auth configured — use demo defaults
  }

  /* ── Greeting ─────────────────────────────────────────────── */
  const h = new Date().getHours();
  const greeting = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  const cta = PERSONA_CTA[p.persona!];

  /* ── Band counts ──────────────────────────────────────────── */
  const bands: Record<string, number> = { Safe: 0, Target: 0, Reach: 0 };
  (assessments || []).forEach((a: any) => { if (a.band in bands) bands[a.band]++; });

  return (
    <div style={{ padding: "48px 52px", maxWidth: "860px" }}>

      {/* ── Greeting + persona badge ───────────────────────── */}
      <div style={{ marginBottom: "48px" }}>
        <span className="micro-label" style={{ marginBottom: "12px", display: "block" }}>
          {greeting}
        </span>
        <h1
          className="serif"
          style={{
            fontSize: "48px",
            fontWeight: 400,
            letterSpacing: "-0.025em",
            color: "var(--t)",
            lineHeight: 1.1,
            marginBottom: "12px",
          }}
        >
          {p.name}
        </h1>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "13px", color: "var(--t3)" }}>
            {p.curriculum === "IB" ? "IB Diploma" : "A-Levels"}
            {p.predicted_summary && <> &middot; {p.predicted_summary}</>}
            {" "}&middot; {p.home_or_intl === "HOME" ? "UK / Home" : "International"}
          </span>
        </div>
      </div>

      {/* ── Persona CTA panel ──────────────────────────────── */}
      <Link
        href={cta.href}
        style={{ textDecoration: "none", display: "block", marginBottom: "12px" }}
      >
        <div
          style={{
            padding: "24px 28px",
            borderRadius: "var(--r-lg)",
            border: "1px solid var(--acc-border)",
            background: "var(--s1)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04), inset 0 -1px 0 rgba(0,0,0,0.3), 0 0 40px var(--acc-glow)",
            transition: "border-color 150ms, box-shadow 150ms",
          }}
        >
          <span className="micro-label" style={{ color: "var(--acc)", marginBottom: "8px", display: "block" }}>
            Recommended
          </span>
          <p className="serif" style={{ fontSize: "22px", fontWeight: 400, color: "var(--t)", marginBottom: "6px" }}>
            {cta.label}
          </p>
          <p style={{ fontSize: "13px", color: "var(--t3)", lineHeight: 1.5 }}>
            {cta.sub}
          </p>
        </div>
      </Link>

      {/* ── Stats row ──────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "10px",
          marginBottom: "12px",
        }}
      >
        {/* Predicted */}
        <div
          className="card"
          style={{
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03), var(--shadow-panel)",
          }}
        >
          <span className="micro-label" style={{ marginBottom: "10px" }}>
            {p.curriculum === "IB" ? "Predicted" : "Grades"}
          </span>
          {p.curriculum === "IB" ? (
            <>
              <p className="serif" style={{ fontSize: "42px", fontWeight: 400, color: "var(--t)", lineHeight: 1 }}>
                {p.ib_total_points ?? "—"}
              </p>
              <p style={{ fontSize: "11px", color: "var(--t3)", marginTop: "4px" }}>
                of 45 points
              </p>
            </>
          ) : (
            <p className="serif" style={{ fontSize: "24px", color: "var(--t)", lineHeight: 1.2 }}>
              {p.predicted_summary || "—"}
            </p>
          )}
        </div>

        {/* Assessed */}
        <div
          className="card"
          style={{
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03), var(--shadow-panel)",
          }}
        >
          <span className="micro-label" style={{ marginBottom: "10px" }}>Assessed</span>
          <p className="serif" style={{ fontSize: "42px", fontWeight: 400, color: "var(--t)", lineHeight: 1 }}>
            {assessments?.length || 0}
          </p>
          <p style={{ fontSize: "11px", color: "var(--t3)", marginTop: "4px" }}>
            of 5 UCAS slots
          </p>
        </div>

        {/* Interests */}
        <div
          className="card"
          style={{
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03), var(--shadow-panel)",
          }}
        >
          <span className="micro-label" style={{ marginBottom: "10px" }}>Interests</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
            {(p.interest_tags || []).slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="pill"
                style={{
                  background: "var(--acc-dim)",
                  color: "var(--acc)",
                  border: "1px solid var(--acc-border)",
                  fontSize: "8px",
                }}
              >
                {tag}
              </span>
            ))}
            {(p.interest_tags || []).length > 4 && (
              <span className="pill" style={{ background: "var(--s3)", color: "var(--t3)", border: "1px solid var(--b)" }}>
                +{p.interest_tags.length - 4}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Quick actions ──────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", marginBottom: "40px" }}>
        {QUICK_ACTIONS.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            style={{ textDecoration: "none" }}
          >
            <div
              className="card card-hover"
              style={{
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03), var(--shadow-panel)",
              }}
            >
              <p className="serif" style={{ fontSize: "17px", fontWeight: 400, color: "var(--t)", marginBottom: "4px" }}>
                {a.label}
              </p>
              <p style={{ fontSize: "11px", color: "var(--t3)" }}>{a.sub}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* ── Shortlisted courses ────────────────────────────── */}
      <div style={{ marginBottom: "32px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
          <h3 className="headline-sm">Shortlisted courses</h3>
          <Link href="/my-space/explore" className="micro-label" style={{ textDecoration: "none", color: "var(--t3)" }}>
            Explore &rarr;
          </Link>
        </div>
        {shortlisted && shortlisted.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {shortlisted.map((s: any) => (
              <div
                key={s.course_key}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "14px 20px",
                  background: "var(--s1)",
                  border: "1px solid var(--b)",
                  borderRadius: "var(--r)",
                }}
              >
                <div>
                  <p style={{ fontSize: "14px", color: "var(--t)", fontWeight: 500, marginBottom: "2px" }}>
                    {s.course_name}
                  </p>
                  <p className="mono" style={{ fontSize: "11px", color: "var(--t3)" }}>
                    {s.universities_count} {s.universities_count === 1 ? "university" : "universities"}
                  </p>
                </div>
                <Link
                  href="/my-space/explore"
                  className="micro-label"
                  style={{
                    textDecoration: "none",
                    color: "var(--t3)",
                    border: "1px solid var(--b)",
                    borderRadius: "9999px",
                    padding: "4px 12px",
                  }}
                >
                  View
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div
            style={{
              padding: "24px",
              background: "var(--s1)",
              border: "1px solid var(--b)",
              borderRadius: "var(--r)",
            }}
          >
            <p style={{ fontSize: "13px", color: "var(--t3)", marginBottom: "8px" }}>
              No courses shortlisted yet.
            </p>
            <Link href="/my-space/explore" style={{ fontSize: "13px", color: "var(--acc)", textDecoration: "none" }}>
              Explore courses &rarr;
            </Link>
          </div>
        )}
      </div>

      {/* ── Recent assessments ─────────────────────────────── */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
          <h3 className="headline-sm">Recent assessments</h3>
          <Link href="/my-space/tracker" className="micro-label" style={{ textDecoration: "none", color: "var(--t3)" }}>
            Tracker &rarr;
          </Link>
        </div>
        {assessments && assessments.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {assessments.map((a: any) => {
              const bs = BAND_STYLE[a.band] || BAND_STYLE.Reach;
              return (
                <div
                  key={a.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "16px 20px",
                    background: "var(--s1)",
                    border: "1px solid var(--b)",
                    borderRadius: "var(--r)",
                  }}
                >
                  <div>
                    <p style={{ fontSize: "14px", color: "var(--t)", fontWeight: 500, marginBottom: "2px" }}>
                      {a.course_name}
                    </p>
                    <p className="mono" style={{ fontSize: "11px", color: "var(--t3)" }}>
                      {a.university_name}
                    </p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <span className="serif" style={{ fontSize: "22px", color: "var(--t)" }}>
                      {a.chance_percent}%
                    </span>
                    <span
                      className="pill"
                      style={{ background: bs.bg, color: bs.color, border: bs.border }}
                    >
                      {a.band}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div
            style={{
              padding: "24px",
              background: "var(--s1)",
              border: "1px solid var(--b)",
              borderRadius: "var(--r)",
            }}
          >
            <p style={{ fontSize: "13px", color: "var(--t3)", marginBottom: "8px" }}>
              No assessments yet.
            </p>
            <Link href="/my-space/assess" style={{ fontSize: "13px", color: "var(--acc)", textDecoration: "none" }}>
              Check offer chances &rarr;
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
