"use client";
import Link from "next/link";

export function PersonaCards() {
  return (
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
  );
}
