"use client";

import React from "react";

interface ChipSetProps {
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
  /** Allow multiple selections (default true) */
  multi?: boolean;
  className?: string;
}

/**
 * Pills for tags and vibe keywords.
 * Active state: accent outline + glow.
 */
export default function ChipSet({
  options,
  selected,
  onToggle,
  multi = true,
  className = "",
}: ChipSetProps) {
  const handleClick = (value: string) => {
    if (!multi && !selected.includes(value)) {
      onToggle(value);
    } else {
      onToggle(value);
    }
  };

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {options.map((opt) => {
        const active = selected.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => handleClick(opt)}
            className={`
              px-4 py-2
              rounded-full
              font-mono text-[10px] font-medium uppercase tracking-[0.1em]
              transition-all duration-150
              border
              ${
                active
                  ? "border-[var(--acc-border)] bg-[var(--acc-dim)] text-[var(--acc)] shadow-[0_0_12px_var(--acc-glow)]"
                  : "border-[var(--b)] bg-transparent text-[var(--t3)] hover:border-[var(--b-strong)] hover:text-[var(--t2)]"
              }
            `}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}
