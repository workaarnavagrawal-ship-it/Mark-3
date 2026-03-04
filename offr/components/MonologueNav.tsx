"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PersonaBadge } from "@/components/ui/PersonaBadge";
import type { PersonaCode } from "@/lib/types";

// ─── Nav definition ────────────────────────────────────────────────

const MY_JOURNEY_NAV = [
  { href: "/dashboard",           label: "My Space" },
  { href: "/dashboard/strategy",  label: "My Strategy" },
  { href: "/dashboard/explore",   label: "Database" },
  { href: "/dashboard/ps",        label: "Your PS" },
  { href: "/dashboard/result",    label: "Results" },
];

const ACCOUNT_NAV = [
  { href: "/dashboard/profile",   label: "Profile" },
  { href: "/dashboard/faq",       label: "FAQ" },
];

// ─── Component ────────────────────────────────────────────────────

interface MonologueNavProps {
  name: string;
  persona?: PersonaCode | null;
  ibTotal?: number | null;
}

export function MonologueNav({ name, persona, ibTotal }: MonologueNavProps) {
  const pathname = usePathname();
  const router   = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  }

  const initials = (name || "?")
    .split(" ")
    .map((w) => w[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");

  return (
    <aside
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        height: "100vh",
        width: 210,
        background: "var(--s1)",
        borderRight: "1px solid var(--b)",
        display: "flex",
        flexDirection: "column",
        padding: "20px 12px",
        overflowY: "auto",
        zIndex: 40,
      }}
    >
      {/* Logo */}
      <Link
        href="/dashboard"
        style={{
          fontFamily: "var(--font-garamond, var(--serif))",
          fontSize: 22,
          fontStyle: "italic",
          fontWeight: 400,
          color: "var(--t)",
          textDecoration: "none",
          letterSpacing: "-0.02em",
          padding: "0 4px",
          marginBottom: 20,
          display: "block",
        }}
      >
        offr
      </Link>

      {/* User block */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 8px",
          borderRadius: 10,
          background: "var(--s2)",
          border: "1px solid var(--b)",
          marginBottom: 4,
        }}
      >
        {/* Avatar */}
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: "50%",
            background: "var(--acc)",
            color: "var(--t-inv)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            fontWeight: 600,
            flexShrink: 0,
          }}
        >
          {initials}
        </div>
        <div style={{ minWidth: 0 }}>
          <p
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: "var(--t)",
              lineHeight: 1.2,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {name}
          </p>
          {ibTotal != null && (
            <p style={{ fontSize: 11, color: "var(--t3)" }}>{ibTotal} / 45</p>
          )}
        </div>
      </div>

      {/* Persona badge */}
      {persona && (
        <div style={{ padding: "6px 8px", marginBottom: 8 }}>
          <PersonaBadge persona={persona} />
        </div>
      )}

      {/* ── My Journey nav group ── */}
      <NavSection label="My Journey" items={MY_JOURNEY_NAV} pathname={pathname} />

      {/* ── Account nav group ── */}
      <NavSection label="Account" items={ACCOUNT_NAV} pathname={pathname} />

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Sign out */}
      <button
        onClick={signOut}
        style={{
          width: "100%",
          padding: "9px 12px",
          borderRadius: 10,
          background: "transparent",
          border: "1px solid var(--b)",
          color: "var(--t3)",
          fontSize: 13,
          cursor: "pointer",
          textAlign: "left",
          transition: "all 150ms",
          fontFamily: "var(--sans)",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.borderColor = "var(--b-strong)";
          (e.currentTarget as HTMLElement).style.color = "var(--t2)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.borderColor = "var(--b)";
          (e.currentTarget as HTMLElement).style.color = "var(--t3)";
        }}
      >
        Sign out
      </button>
    </aside>
  );
}

// ── NavSection ────────────────────────────────────────────────────

function NavSection({
  label,
  items,
  pathname,
}: {
  label: string;
  items: { href: string; label: string }[];
  pathname: string;
}) {
  return (
    <div style={{ marginBottom: 8 }}>
      <p
        className="label"
        style={{ padding: "0 8px", marginBottom: 4, marginTop: 8 }}
      >
        {label}
      </p>
      <nav style={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {items.map((item) => {
          const active =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-link${active ? " nav-active" : ""}`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
