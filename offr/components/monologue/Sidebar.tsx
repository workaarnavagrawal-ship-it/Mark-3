"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import LabelRail from "./LabelRail";

const NAV = [
  { href: "/my-space",     label: "My Space",     icon: "◈" },
  { href: "/my-strategy",  label: "Strategy",     icon: "◆" },
  { href: "/your-ps",      label: "Your PS",      icon: "▣" },
  { href: "/database",     label: "Database",     icon: "◉" },
  { href: "/results",      label: "Results",      icon: "▲" },
  { href: "/faq",          label: "FAQ",           icon: "?" },
  { href: "/profile",      label: "Profile",      icon: "●" },
];

interface SidebarProps {
  name: string;
  persona?: string | null;
}

export default function Sidebar({ name, persona }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-sidebar bg-[var(--s1)] border-r border-[var(--b)] flex flex-col z-50">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-[var(--b)]">
        <Link href="/" className="no-underline">
          <span className="serif text-2xl font-normal italic text-[var(--t)]">
            offr
          </span>
        </Link>
      </div>

      {/* User */}
      <div className="px-5 py-4 border-b border-[var(--b)]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[var(--s3)] border border-[var(--b-strong)] flex items-center justify-center shrink-0">
            <span className="serif text-sm text-[var(--t2)]">
              {name?.[0]?.toUpperCase() || "?"}
            </span>
          </div>
          <div className="overflow-hidden">
            <p className="text-sm text-[var(--t)] font-medium truncate">
              {name || "Student"}
            </p>
            {persona && (
              <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--t3)]">
                {persona}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5 overflow-y-auto">
        {NAV.map(({ href, label, icon }) => {
          const active =
            pathname === href ||
            (href !== "/my-space" && pathname.startsWith(href + "/"));
          return (
            <Link
              key={href}
              href={href}
              className={`nav-link ${active ? "nav-active" : ""}`}
            >
              <span className="text-xs opacity-60">{icon}</span>
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Sign out */}
      <div className="px-3 py-3 border-t border-[var(--b)]">
        <button
          onClick={signOut}
          className="
            w-full text-left px-3 py-2
            rounded-lg bg-transparent border-none
            text-[var(--t3)] font-mono text-[10px] uppercase tracking-[0.08em]
            cursor-pointer transition-all duration-150
            hover:bg-[var(--s3)] hover:text-[var(--t2)]
          "
        >
          Sign Out
        </button>
      </div>
    </aside>
  );
}
