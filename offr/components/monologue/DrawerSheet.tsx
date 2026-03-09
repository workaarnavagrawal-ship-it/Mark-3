"use client";

import React, { useEffect, useCallback } from "react";

interface DrawerSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  /** "right" slides from right, "bottom" slides from bottom */
  direction?: "right" | "bottom";
  className?: string;
}

/**
 * Slide-up or slide-right details panel.
 */
export default function DrawerSheet({
  open,
  onClose,
  title,
  children,
  direction = "right",
  className = "",
}: DrawerSheetProps) {
  const handleEsc = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleEsc);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [open, handleEsc]);

  if (!open) return null;

  const isRight = direction === "right";

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm fade-in"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`
          fixed z-50
          bg-[var(--s1)] border-[var(--b-panel)]
          shadow-deep
          overflow-y-auto
          ${
            isRight
              ? "top-0 right-0 h-full w-full max-w-[480px] border-l animate-slide-right"
              : "bottom-0 left-0 right-0 max-h-[85vh] rounded-t-[20px] border-t slide-up"
          }
          ${className}
        `}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-[var(--b)] bg-[var(--s1)]">
          {title && (
            <span className="font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--t3)]">
              {title}
            </span>
          )}
          <button
            onClick={onClose}
            className="ml-auto text-[var(--t3)] hover:text-[var(--t)] transition-colors text-lg leading-none"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6">{children}</div>
      </div>
    </>
  );
}
