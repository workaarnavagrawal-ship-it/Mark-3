"use client";

import React from "react";
import Sidebar from "./Sidebar";
import LabelRail from "./LabelRail";

interface AppShellProps {
  children: React.ReactNode;
  name: string;
  persona?: string | null;
  /** Top label rail items: e.g. ["MODE: EXPLORER", "AI: ONLINE", "SAVED"] */
  topRailItems?: string[];
  /** Right console rail content (optional) */
  rightRail?: React.ReactNode;
}

/**
 * Core app layout: sidebar + main column + optional right console rail.
 * Notion-like structure but components look like expensive hardware UI.
 */
export default function AppShell({
  children,
  name,
  persona,
  topRailItems,
  rightRail,
}: AppShellProps) {
  return (
    <div className="grain-overlay min-h-screen bg-[var(--bg)]">
      <Sidebar name={name} persona={persona} />

      {/* Main area */}
      <div className="ml-sidebar min-h-screen flex flex-col">
        {/* Top label rail */}
        {topRailItems && topRailItems.length > 0 && (
          <div className="sticky top-0 z-40 bg-[var(--bg)]/80 backdrop-blur-sm border-b border-[var(--b)] px-8 py-2.5">
            <LabelRail items={topRailItems} />
          </div>
        )}

        {/* Content area */}
        <div className="flex-1 flex gap-8 px-8 py-8">
          {/* Main column */}
          <main className="flex-1 min-w-0 flex flex-col gap-6">
            {children}
          </main>

          {/* Right rail */}
          {rightRail}
        </div>
      </div>
    </div>
  );
}
