"use client";
import Link from "next/link";

interface PersonaLink {
  href: string;
  label: string;
  sub: string;
}

export function PersonaLinks({ items }: { items: PersonaLink[] }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", marginBottom: "40px" }}>
      {items.map(item => (
        <Link key={item.href} href={item.href} style={{
          display: "block", padding: "22px 22px",
          background: "var(--s1)", border: "1px solid var(--b)",
          borderRadius: "var(--r)", textDecoration: "none", transition: "all 150ms",
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--b-strong)"; (e.currentTarget as HTMLElement).style.background = "var(--s2)"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--b)"; (e.currentTarget as HTMLElement).style.background = "var(--s1)"; }}>
          <p className="serif" style={{ fontSize: "18px", fontWeight: 400, color: "var(--t)", marginBottom: "6px" }}>{item.label}</p>
          <p style={{ fontSize: "12px", color: "var(--t3)", lineHeight: 1.5 }}>{item.sub}</p>
        </Link>
      ))}
    </div>
  );
}
