"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { PersonaV2 } from "@/lib/types";

/* ── Nav links grouped by section ─────────────────────────────── */

const CORE_NAV = [
  { href: "/my-space",          label: "My Space" },
  { href: "/my-strategy",  label: "My Strategy" },
  { href: "/your-ps",      label: "Your PS" },
  { href: "/database",     label: "Database" },
  { href: "/results",      label: "Results" },
];

const TOOLS_NAV = [
  { href: "/profile", label: "Profile" },
  { href: "/faq",     label: "FAQ" },
];

/* ── Persona badge config ─────────────────────────────────────── */

const PERSONA_META: Record<PersonaV2, { tag: string; color: string }> = {
  EXPLORER:   { tag: "Explorer",   color: "var(--safe-t)" },
  STRATEGIST: { tag: "Strategist", color: "var(--tgt-t)" },
  FINISHER:   { tag: "Finisher",   color: "var(--rch-t)" },
};

interface Props {
  name: string;
  persona: PersonaV2 | null;
}

export function Sidebar({ name, persona }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  }

  const pm = persona ? PERSONA_META[persona] : null;

  return (
    <aside
      className="sidebar"
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        height: "100vh",
        width: "var(--sidebar-w)",
        background: "var(--s1)",
        borderRight: "1px solid var(--b)",
        display: "flex",
        flexDirection: "column",
        zIndex: 50,
      }}
    >
      {/* ── Brand ── */}
      <div style={{ padding: "28px 24px 24px", borderBottom: "1px solid var(--b)" }}>
        <Link href="/my-space" style={{ textDecoration: "none" }}>
          <span className="serif" style={{ fontSize: "22px", fontWeight: 400, fontStyle: "italic", color: "var(--t)" }}>
            offr
          </span>
        </Link>
      </div>

      {/* ── User block ── */}
      <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--b)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* Avatar */}
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              background: "var(--s3)",
              border: "1px solid var(--b-strong)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <span className="serif" style={{ fontSize: "14px", color: "var(--t2)" }}>
              {name?.[0]?.toUpperCase()}
            </span>
          </div>
          <div style={{ overflow: "hidden", flex: 1 }}>
            <p
              style={{
                fontSize: "13px",
                color: "var(--t)",
                fontWeight: 500,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                marginBottom: "2px",
              }}
            >
              {name}
            </p>
            {pm && (
              <span
                className="mono"
                style={{
                  fontSize: "9px",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                  color: pm.color,
                }}
              >
                {pm.tag}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Core Nav ── */}
      <nav style={{ flex: 1, padding: "16px 12px 8px", display: "flex", flexDirection: "column", gap: "2px", overflowY: "auto" }}>
        <span className="micro-label" style={{ padding: "0 12px", marginBottom: "6px" }}>
          Navigate
        </span>
        {CORE_NAV.map(({ href, label }) => {
          const active = pathname === href;
          return (
            <Link key={href} href={href} className={`nav-link${active ? " nav-active" : ""}`}>
              {label}
            </Link>
          );
        })}

        <span className="micro-label" style={{ padding: "0 12px", marginTop: "20px", marginBottom: "6px" }}>
          Tools
        </span>
        {TOOLS_NAV.map(({ href, label }) => {
          const active = pathname === href;
          return (
            <Link key={href} href={href} className={`nav-link${active ? " nav-active" : ""}`}>
              {label}
            </Link>
          );
        })}
      </nav>

      {/* ── Sign out ── */}
      <div style={{ padding: "12px", borderTop: "1px solid var(--b)" }}>
        <button
          onClick={signOut}
          className="nav-link"
          style={{ width: "100%", background: "transparent", border: "none", cursor: "pointer", textAlign: "left" }}
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
