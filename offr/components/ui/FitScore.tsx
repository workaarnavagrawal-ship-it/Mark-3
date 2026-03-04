"use client";

/**
 * FitScore — displays a numeric fit score (0–99) with colour-coded tier.
 *
 * Tiers:
 *  ≥70  → strong  (green)
 *  ≥45  → ok      (gold)
 *  <45  → low     (red)
 */
interface FitScoreProps {
  score: number;
  /** "pill" shows score inside a coloured pill; "badge" shows just the number */
  variant?: "pill" | "badge";
  className?: string;
}

function tierClass(score: number): string {
  if (score >= 70) return "fit-strong";
  if (score >= 45) return "fit-ok";
  return "fit-low";
}

export function FitScore({ score, variant = "pill", className }: FitScoreProps) {
  if (variant === "badge") {
    return (
      <span
        className={className}
        style={{ fontSize: 13, fontWeight: 600, color: scoreColor(score) }}
      >
        {score}
      </span>
    );
  }
  return (
    <span
      className={`pill ${tierClass(score)} ${className ?? ""}`}
      style={{ fontWeight: 600 }}
    >
      {score}
    </span>
  );
}

function scoreColor(score: number): string {
  if (score >= 70) return "var(--fit-strong-t)";
  if (score >= 45) return "var(--fit-ok-t)";
  return "var(--fit-low-t)";
}
