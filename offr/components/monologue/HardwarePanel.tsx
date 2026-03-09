"use client";

import React from "react";

interface HardwarePanelProps {
  children: React.ReactNode;
  header?: React.ReactNode;
  className?: string;
  spotlight?: boolean;
  /** Reduces padding for compact layouts */
  compact?: boolean;
}

export default function HardwarePanel({
  children,
  header,
  className = "",
  spotlight = false,
  compact = false,
}: HardwarePanelProps) {
  return (
    <div
      className={`
        relative rounded-[20px] border border-[var(--b-panel)]
        bg-[var(--s1)]
        shadow-panel
        ${spotlight ? "spotlight" : ""}
        ${className}
      `}
      style={{
        /* Inner bevel: faint top highlight + deep bottom shadow */
        boxShadow: `
          inset 0 1px 0 rgba(255,255,255,0.04),
          inset 0 -1px 0 rgba(0,0,0,0.3),
          var(--shadow-panel)
        `,
      }}
    >
      {header && (
        <div className="border-b border-[var(--b)] px-6 py-3">
          {header}
        </div>
      )}
      <div className={`relative z-10 ${compact ? "p-4" : "p-6"}`}>
        {children}
      </div>
    </div>
  );
}
