"use client";

import React from "react";
import LabelRail from "./LabelRail";

interface ConsoleRailProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Right-side console rail. Optional on key pages.
 * Sticky, scrollable within its own height.
 */
export default function ConsoleRail({
  children,
  className = "",
}: ConsoleRailProps) {
  return (
    <aside
      className={`
        w-rail shrink-0
        hidden xl:block
        ${className}
      `}
    >
      <div className="sticky top-6 flex flex-col gap-4">
        {children}
      </div>
    </aside>
  );
}

/* ── Small panel for the rail ──────────────────────────────── */

interface RailPanelProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function RailPanel({ title, children, className = "" }: RailPanelProps) {
  return (
    <div
      className={`
        rounded-2xl border border-[var(--b)]
        bg-[var(--s1)] p-4
        ${className}
      `}
    >
      <div className="mb-3">
        <span className="font-mono text-[9px] font-medium uppercase tracking-[0.14em] text-[var(--t3)]">
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}
