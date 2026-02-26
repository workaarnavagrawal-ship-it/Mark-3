"use client";

/**
 * ProfileSuggestionsPanel — AI profile completeness panel.
 *
 * Deterministic: a reactive checklist computed from form state (instant).
 * AI layer: specific improvement tips fetched from /api/py/profile_suggestions.
 *
 * Shown inside ProfileClient.tsx below the save button.
 * Non-blocking — page and form work fully without it.
 */

import { useCallback, useEffect, useState } from "react";
import { AIBlock } from "@/components/ai/AIBlock";
import { postProfileSuggestions } from "@/lib/api";
import type { AIStatus, ProfileSuggestion, ProfileSuggestionsRequest } from "@/lib/types";

const FIELD_ICONS: Record<string, string> = {
  interests: "◈",
  grades:    "◆",
  ps:        "◉",
  complete:  "✓",
};

const FIELD_LABELS: Record<string, string> = {
  interests: "Interests",
  grades:    "Predicted grades",
  ps:        "Personal statement",
  complete:  "Profile complete",
};

interface Props {
  request: ProfileSuggestionsRequest;
}

export function ProfileSuggestionsPanel({ request }: Props) {
  const [status,      setStatus]      = useState<AIStatus>("idle");
  const [suggestions, setSuggestions] = useState<ProfileSuggestion[]>([]);
  const [error,       setError]       = useState<string | null>(null);

  const fetchSuggestions = useCallback(async () => {
    setStatus("loading");
    setError(null);
    try {
      const res = await postProfileSuggestions(request);
      setSuggestions(res.suggestions ?? []);
      setStatus("ok");
    } catch (e: unknown) {
      setError((e instanceof Error ? e.message : null) ?? "Could not load suggestions.");
      setStatus("error");
    }
  }, [request]);

  useEffect(() => {
    fetchSuggestions();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Completeness checklist — deterministic, instant
  const checks = [
    { label: "Interests (up to 3)",     done: request.interests_count >= 3 },
    { label: "Predicted grades",        done: request.has_grades },
    { label: "Personal statement",      done: request.has_ps && request.ps_length >= 200 },
  ];
  const doneCount = checks.filter(c => c.done).length;
  const pct = Math.round((doneCount / checks.length) * 100);

  return (
    <div style={{ padding: "24px", background: "var(--s1)", border: "1px solid var(--b)", borderRadius: "var(--r)", marginBottom: "12px" }}>
      <p className="label" style={{ marginBottom: "16px" }}>Profile completeness</p>

      {/* Progress bar */}
      <div style={{ marginBottom: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
          <p style={{ fontSize: "13px", color: "var(--t2)" }}>
            {doneCount} of {checks.length} sections complete
          </p>
          <p className="serif" style={{ fontSize: "16px", color: pct === 100 ? "var(--safe-t)" : "var(--t2)" }}>
            {pct}%
          </p>
        </div>
        <div style={{ height: "4px", borderRadius: "2px", background: "var(--s3)", overflow: "hidden" }}>
          <div style={{
            height: "100%",
            borderRadius: "2px",
            background: pct === 100 ? "var(--safe-t)" : "var(--acc)",
            width: `${pct}%`,
            transition: "width 0.5s ease",
          }} />
        </div>
      </div>

      {/* Checklist */}
      <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "18px" }}>
        {checks.map((c, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "13px", color: c.done ? "var(--safe-t)" : "var(--t3)", flexShrink: 0 }}>
              {c.done ? "✓" : "○"}
            </span>
            <p style={{ fontSize: "13px", color: c.done ? "var(--t2)" : "var(--t3)", textDecoration: c.done ? "none" : "none" }}>
              {c.label}
            </p>
          </div>
        ))}
      </div>

      {/* AI suggestions */}
      <div>
        <p className="label" style={{ marginBottom: "10px" }}>AI suggestions</p>
        <AIBlock
          status={status}
          error={error ?? undefined}
          onRetry={fetchSuggestions}
          skeletonLines={2}
        >
          {suggestions.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {suggestions.map((s, i) => (
                <div key={i} style={{
                  padding: "13px 16px",
                  background: s.field === "complete" ? "var(--safe-bg)" : "var(--s2)",
                  border: `1px solid ${s.field === "complete" ? "var(--safe-b)" : "var(--b)"}`,
                  borderRadius: "10px",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "5px" }}>
                    <span style={{ fontSize: "12px", color: s.field === "complete" ? "var(--safe-t)" : "var(--acc)" }}>
                      {FIELD_ICONS[s.field] ?? "→"}
                    </span>
                    <p style={{ fontSize: "12px", fontWeight: 500, color: "var(--t2)", textTransform: "capitalize" }}>
                      {FIELD_LABELS[s.field] ?? s.field}
                    </p>
                  </div>
                  <p style={{ fontSize: "12px", color: "var(--t3)", lineHeight: 1.6, marginBottom: "4px" }}>
                    {s.why}
                  </p>
                  <p style={{ fontSize: "12px", color: "var(--t2)", lineHeight: 1.6, fontStyle: "italic" }}>
                    → {s.action}
                  </p>
                </div>
              ))}
            </div>
          )}
        </AIBlock>
      </div>
    </div>
  );
}
