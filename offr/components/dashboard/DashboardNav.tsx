"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/explore", label: "Explore" },
  { href: "/dashboard/strategy", label: "Strategy" },
  { href: "/dashboard/assess", label: "Offer Chances" },
  { href: "/dashboard/tracker", label: "Tracker" },
  { href: "/dashboard/ps", label: "PS Analyser" },
  { href: "/dashboard/profile", label: "My Profile" },
  { href: "/dashboard/faq", label: "FAQs" },
];

export function DashboardNav({ name }: { name: string }) {
  const pathname = usePathname();
  const router = useRouter();
  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  }
  return (
    <aside style={{ position: "fixed", left: 0, top: 0, height: "100vh", width: "210px", background: "var(--s1)", borderRight: "1px solid var(--b)", display: "flex", flexDirection: "column", zIndex: 50 }}>
      <div style={{ padding: "28px 22px 24px", borderBottom: "1px solid var(--b)" }}>
        <span className="serif" style={{ fontSize: "22px", fontWeight: 400, fontStyle: "italic", color: "var(--t)" }}>offr</span>
      </div>
      <div style={{ padding: "16px 22px", borderBottom: "1px solid var(--b)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "var(--s3)", border: "1px solid var(--b-strong)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span className="serif" style={{ fontSize: "13px", color: "var(--t2)" }}>{name?.[0]?.toUpperCase()}</span>
          </div>
          <div style={{ overflow: "hidden" }}>
            <p style={{ fontSize: "13px", color: "var(--t)", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</p>
            <p style={{ fontSize: "11px", color: "var(--t3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Student</p>
          </div>
        </div>
      </div>
      <nav style={{ flex: 1, padding: "12px 10px", display: "flex", flexDirection: "column", gap: "1px", overflowY: "auto" }}>
        {NAV.map(({ href, label }) => {
          const active = pathname === href;
          return (
            <Link key={href} href={href} style={{
              display: "block", padding: "9px 12px", borderRadius: "10px",
              background: active ? "var(--acc)" : "transparent",
              color: active ? "var(--t-inv)" : "var(--t3)",
              textDecoration: "none", fontSize: "13px",
              fontWeight: active ? 500 : 400, transition: "all 150ms",
            }}
            onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = "var(--s3)"; (e.currentTarget as HTMLElement).style.color = "var(--t2)"; }}}
            onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--t3)"; }}}>
              {label}
            </Link>
          );
        })}
      </nav>
      <div style={{ padding: "10px", borderTop: "1px solid var(--b)" }}>
        <button onClick={signOut} style={{ width: "100%", padding: "9px 12px", borderRadius: "10px", background: "transparent", border: "none", color: "var(--t3)", fontSize: "13px", cursor: "pointer", textAlign: "left", fontFamily: "var(--font-dm, var(--sans))", transition: "all 150ms" }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--s3)"; (e.currentTarget as HTMLElement).style.color = "var(--t2)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--t3)"; }}>
          Sign out
        </button>
      </div>
    </aside>
  );
}
