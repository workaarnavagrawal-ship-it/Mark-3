"use client";

import type { PersonaCode } from "@/lib/types";

const LABELS: Record<PersonaCode, string> = {
  EXPLORER:   "Explorer",
  STRATEGIST: "Strategist",
  FINISHER:   "Finisher",
};

const CLASSES: Record<PersonaCode, string> = {
  EXPLORER:   "persona-pill persona-pill-explorer",
  STRATEGIST: "persona-pill persona-pill-strategist",
  FINISHER:   "persona-pill persona-pill-finisher",
};

interface PersonaBadgeProps {
  persona: PersonaCode | null | undefined;
  className?: string;
}

export function PersonaBadge({ persona, className }: PersonaBadgeProps) {
  if (!persona) return null;
  return (
    <span className={`${CLASSES[persona]} ${className ?? ""}`}>
      {LABELS[persona]}
    </span>
  );
}
