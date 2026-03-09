"use client";

import React from "react";

/* ── PrimaryActionKey ──────────────────────────────────────────
   Large teal key button. One per page.
   ────────────────────────────────────────────────────────────── */

interface PrimaryActionKeyProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  type?: "button" | "submit";
}

export function PrimaryActionKey({
  children,
  onClick,
  disabled = false,
  loading = false,
  className = "",
  type = "button",
}: PrimaryActionKeyProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        relative w-full py-4 px-6
        rounded-xl
        bg-[var(--acc)] text-[var(--t-inv)]
        font-mono text-xs font-bold uppercase tracking-[0.14em]
        transition-all duration-150
        hover:bg-[var(--acc-h)] hover:shadow-glow
        active:translate-y-[1px]
        disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:hover:translate-y-0
        ${className}
      `}
      style={{
        boxShadow: disabled
          ? "none"
          : "0 2px 12px rgba(0,229,199,0.15), inset 0 1px 0 rgba(255,255,255,0.2)",
      }}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <span className="w-4 h-4 border-2 border-[var(--t-inv)] border-t-transparent rounded-full animate-spin" />
          <span>PROCESSING</span>
        </span>
      ) : (
        children
      )}
    </button>
  );
}

/* ── SecondaryKey ──────────────────────────────────────────────
   Subtle outline button.
   ────────────────────────────────────────────────────────────── */

interface SecondaryKeyProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit";
}

export function SecondaryKey({
  children,
  onClick,
  disabled = false,
  className = "",
  type = "button",
}: SecondaryKeyProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        py-3 px-5
        rounded-xl
        border border-[var(--b-strong)] bg-transparent
        text-[var(--t2)]
        font-mono text-[10px] font-medium uppercase tracking-[0.1em]
        transition-all duration-150
        hover:border-[var(--acc-border)] hover:text-[var(--acc)]
        disabled:opacity-40 disabled:cursor-not-allowed
        ${className}
      `}
    >
      {children}
    </button>
  );
}

/* ── QuietButton ──────────────────────────────────────────────
   Minimal, muted text button for tertiary actions.
   ────────────────────────────────────────────────────────────── */

interface QuietButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

export function QuietButton({
  children,
  onClick,
  disabled = false,
  className = "",
}: QuietButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        text-[var(--t3)] text-xs
        font-mono uppercase tracking-[0.08em]
        transition-colors duration-150
        hover:text-[var(--t2)]
        disabled:opacity-40 disabled:cursor-not-allowed
        ${className}
      `}
    >
      {children}
    </button>
  );
}
