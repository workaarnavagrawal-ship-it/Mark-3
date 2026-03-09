"use client";

import React, { useEffect, useState } from "react";

/* ── Toast ─────────────────────────────────────────────────────
   Calm notification. Auto-dismisses after duration.
   ────────────────────────────────────────────────────────────── */

interface ToastProps {
  message: string;
  type?: "info" | "success" | "error";
  visible: boolean;
  onDismiss: () => void;
  duration?: number;
}

export function Toast({
  message,
  type = "info",
  visible,
  onDismiss,
  duration = 4000,
}: ToastProps) {
  useEffect(() => {
    if (visible && duration > 0) {
      const t = setTimeout(onDismiss, duration);
      return () => clearTimeout(t);
    }
  }, [visible, duration, onDismiss]);

  if (!visible) return null;

  const borderColor =
    type === "error"
      ? "border-[var(--rch-b)]"
      : type === "success"
        ? "border-[var(--safe-b)]"
        : "border-[var(--b-strong)]";

  const textColor =
    type === "error"
      ? "text-[var(--rch-t)]"
      : type === "success"
        ? "text-[var(--safe-t)]"
        : "text-[var(--t2)]";

  return (
    <div className="fixed bottom-6 right-6 z-[100] slide-up">
      <div
        className={`
          px-5 py-3 rounded-xl
          bg-[var(--s2)] border ${borderColor}
          shadow-panel
          font-mono text-[11px] ${textColor}
          flex items-center gap-3
        `}
      >
        <span>{message}</span>
        <button
          onClick={onDismiss}
          className="text-[var(--t3)] hover:text-[var(--t)] text-xs"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

/* ── InlineError ───────────────────────────────────────────────
   Calm inline error state. Never crashes pages.
   ────────────────────────────────────────────────────────────── */

interface InlineErrorProps {
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function InlineError({
  message,
  onRetry,
  className = "",
}: InlineErrorProps) {
  return (
    <div
      className={`
        flex items-center gap-3
        px-4 py-3 rounded-xl
        bg-[var(--rch-bg)] border border-[var(--rch-b)]
        ${className}
      `}
    >
      <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--rch-t)]">
        {message}
      </span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="
            ml-auto font-mono text-[10px] uppercase tracking-[0.1em]
            text-[var(--t3)] hover:text-[var(--t)]
            transition-colors
          "
        >
          RETRY
        </button>
      )}
    </div>
  );
}
