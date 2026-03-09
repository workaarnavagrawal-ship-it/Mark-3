"use client";

import React from "react";

interface MeterProps {
  label: string;
  value: number; // 0–100
  className?: string;
  /** Color variant */
  variant?: "accent" | "safe" | "target" | "reach";
}

/**
 * Fit %, match % bar with mono label.
 */
export default function Meter({
  label,
  value,
  className = "",
  variant = "accent",
}: MeterProps) {
  const clamped = Math.max(0, Math.min(100, value));

  const barColors: Record<string, string> = {
    accent: "bg-[var(--acc)]",
    safe:   "bg-[var(--safe-t)]",
    target: "bg-[var(--tgt-t)]",
    reach:  "bg-[var(--rch-t)]",
  };

  return (
    <div className={`${className}`}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--t3)]">
          {label}
        </span>
        <span className="font-mono text-[11px] font-semibold text-[var(--t)]">
          {clamped}%
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-[var(--s3)] overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${barColors[variant] || barColors.accent}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
