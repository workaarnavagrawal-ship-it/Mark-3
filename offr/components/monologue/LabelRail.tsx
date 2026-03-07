"use client";

import React from "react";

interface LabelRailProps {
  items: string[];
  className?: string;
}

/**
 * Mono, spaced-caps rail: e.g. "MODE: EXPLORER · SAVED · AI: ONLINE"
 */
export default function LabelRail({ items, className = "" }: LabelRailProps) {
  return (
    <div
      className={`
        flex items-center gap-2 flex-wrap
        font-mono text-[10px] font-medium uppercase tracking-[0.12em]
        text-[var(--t3)]
        ${className}
      `}
    >
      {items.map((item, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span className="text-[var(--b-strong)]">·</span>}
          <span>{item}</span>
        </React.Fragment>
      ))}
    </div>
  );
}
