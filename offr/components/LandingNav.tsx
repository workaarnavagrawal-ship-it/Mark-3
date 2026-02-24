"use client";
import Link from "next/link";

export function LandingNav() {
  return (
    <nav style={{ padding: "28px 48px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--b)" }}>
      <span className="serif" style={{ fontSize: "22px", fontWeight: 400, fontStyle: "italic", letterSpacing: "-0.02em", color: "var(--t)" }}>offr</span>
      <Link href="/auth" style={{ fontSize: "13px", color: "var(--t3)", textDecoration: "none", transition: "color 150ms" }}>Sign in →</Link>
    </nav>
  );
}
