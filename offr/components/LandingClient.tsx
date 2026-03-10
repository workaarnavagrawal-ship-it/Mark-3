"use client";

import Link from "next/link";
import HardwarePanel from "@/components/monologue/HardwarePanel";
import LabelRail from "@/components/monologue/LabelRail";
import { PrimaryActionKey, SecondaryKey } from "@/components/monologue/Keys";
import { useState } from "react";

const MODE_CHIPS = ["CLARITY", "STRATEGY", "FINAL CHECKS"];

const REVIEWS = [
  {
    quote: "I had no idea my chances at LSE were that realistic until offr showed me the numbers.",
    name: "A.K.",
    detail: "IB 40 · LSE Economics",
  },
  {
    quote: "The PS analyser caught things my school counsellor missed. Brutally honest — exactly what I needed.",
    name: "S.M.",
    detail: "A-Level · UCL Law",
  },
  {
    quote: "I switched from all Reach choices to a balanced list. Got 4 offers instead of maybe 1.",
    name: "R.P.",
    detail: "IB 36 · Warwick, Bath, Exeter",
  },
];

const HOW_STEPS = [
  { step: "01", title: "BUILD", desc: "Create your profile: curriculum, grades, interests. Takes 2 minutes." },
  { step: "02", title: "PICK MODE", desc: "Explorer, Strategist, or Finisher — each path adapts to where you are." },
  { step: "03", title: "GET CLARITY", desc: "Course recommendations, offer predictions, and PS analysis — all grounded in real data." },
];

export function LandingClient() {
  const [activeMode, setActiveMode] = useState(0);

  return (
    <>
      {/* ── Hero ── */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "80px 24px 60px" }}>
        <div style={{ maxWidth: "680px", width: "100%", textAlign: "center" }}>

          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", border: "1px solid var(--b)", borderRadius: "9999px", padding: "5px 14px", fontSize: "12px", color: "var(--t3)", marginBottom: "48px" }}>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--safe-t)", display: "inline-block", animation: "pulse 2s infinite" }} />
            Real 2024–25 applicant data · Free
          </div>

          <h1 className="serif" style={{ fontSize: "72px", fontWeight: 400, letterSpacing: "-0.03em", color: "var(--t)", lineHeight: 1, marginBottom: "28px", fontStyle: "italic" }}>
            Everything you<br />need to get an Offr.
          </h1>

          <p style={{ fontSize: "17px", color: "var(--t3)", lineHeight: 1.75, maxWidth: "440px", margin: "0 auto 48px" }}>
            Build your profile once. Get honest, explainable offer predictions for every UCAS choice.
          </p>

          {/* ── OFFR CONSOLE HardwarePanel ── */}
          <div style={{ maxWidth: "480px", margin: "0 auto 48px" }}>
            <HardwarePanel
              spotlight
              header={<LabelRail items={["OFFR CONSOLE", "v1.0", "ONLINE"]} />}
            >
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "24px" }}>
                <div className="flex gap-2">
                  {MODE_CHIPS.map((chip, i) => (
                    <button
                      key={chip}
                      onClick={() => setActiveMode(i)}
                      className={`
                        px-4 py-2 rounded-full font-mono text-[10px] font-medium uppercase tracking-[0.1em]
                        transition-all duration-150 border
                        ${i === activeMode
                          ? "border-[var(--acc-border)] bg-[var(--acc-dim)] text-[var(--acc)] shadow-[0_0_12px_var(--acc-glow)]"
                          : "border-[var(--b)] bg-transparent text-[var(--t3)] hover:border-[var(--b-strong)] hover:text-[var(--t2)]"
                        }
                      `}
                    >
                      {chip}
                    </button>
                  ))}
                </div>

                <p className="font-mono" style={{ fontSize: "11px", color: "var(--t3)", textAlign: "center" }}>
                  {activeMode === 0 && "Don't know what to study? Generate a shortlist from your interests."}
                  {activeMode === 1 && "Know the direction? Build your 5 choices, PS, and run checks."}
                  {activeMode === 2 && "Ready to submit? Final offer checks, PS analysis, and lock in."}
                </p>

                <Link href="/auth" style={{ textDecoration: "none", width: "100%" }}>
                  <PrimaryActionKey>GET YOUR OFFR</PrimaryActionKey>
                </Link>
              </div>
            </HardwarePanel>
          </div>
        </div>

        {/* ── Reviews ── */}
        <div style={{ maxWidth: "900px", width: "100%", marginBottom: "64px" }}>
          <p className="font-mono" style={{ fontSize: "9px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--t3)", textAlign: "center", marginBottom: "28px" }}>
            What students say
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
            {REVIEWS.map((r, i) => (
              <HardwarePanel key={i} compact>
                <p className="serif" style={{ fontSize: "15px", fontStyle: "italic", color: "var(--t)", lineHeight: 1.6, marginBottom: "16px" }}>
                  &ldquo;{r.quote}&rdquo;
                </p>
                <div>
                  <p className="font-mono" style={{ fontSize: "11px", fontWeight: 600, color: "var(--t2)" }}>
                    {r.name}
                  </p>
                  <p className="font-mono" style={{ fontSize: "10px", color: "var(--t3)" }}>
                    {r.detail}
                  </p>
                </div>
              </HardwarePanel>
            ))}
          </div>
        </div>

        {/* ── How it works ── */}
        <div style={{ maxWidth: "900px", width: "100%", marginBottom: "48px" }}>
          <p className="font-mono" style={{ fontSize: "9px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--t3)", textAlign: "center", marginBottom: "28px" }}>
            How it works
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
            {HOW_STEPS.map((s) => (
              <HardwarePanel key={s.step} compact>
                <span className="font-mono" style={{ fontSize: "24px", fontWeight: 300, color: "var(--acc)", display: "block", marginBottom: "12px" }}>
                  {s.step}
                </span>
                <p className="font-mono" style={{ fontSize: "12px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--t)", marginBottom: "8px" }}>
                  {s.title}
                </p>
                <p style={{ fontSize: "13px", color: "var(--t3)", lineHeight: 1.6 }}>
                  {s.desc}
                </p>
              </HardwarePanel>
            ))}
          </div>
        </div>

        {/* ── UCAS snippet ── */}
        <div style={{ maxWidth: "480px", width: "100%", textAlign: "center", marginBottom: "32px" }}>
          <p className="font-mono" style={{ fontSize: "11px", color: "var(--t3)", letterSpacing: "0.04em", lineHeight: 1.8 }}>
            5 choices. Structured PS. Deadline aware.<br />
            Grounded in real entry data from 14 UK universities.
          </p>
        </div>

        {/* ── Bottom CTA ── */}
        <Link href="/auth" style={{ textDecoration: "none" }}>
          <SecondaryKey>Start free — no credit card</SecondaryKey>
        </Link>
      </main>

      {/* ── Proof strip ── */}
      <div style={{ padding: "20px 48px", borderTop: "1px solid var(--b)", display: "flex", gap: "32px", justifyContent: "center", flexWrap: "wrap" }}>
        {["4,000+ offer holders · 2024–25", "IB & A-Levels supported", "No credit card needed"].map(t => (
          <span key={t} style={{ fontSize: "12px", color: "var(--t3)" }}>{t}</span>
        ))}
      </div>
    </>
  );
}
