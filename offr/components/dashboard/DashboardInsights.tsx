"use client";

/**
 * DashboardInsights — AI-powered "what to do next" block.
 *
 * Deterministic inputs are passed as props (already fetched server-side).
 * On mount this component calls /api/py/dashboard_insights and renders:
 *   - A one-sentence clarity summary
 *   - The single highest-priority next action
 *   - Profile gap list (if any)
 *   - Portfolio commentary (if assessments exist)
 *
 * Falls back silently to nothing if AI is unavailable or errors — the
 * rest of the dashboard page is completely unaffected.
 */

import { useCallback, useEffect, useState } from "react";
import { AIBlock } from "@/components/ai/AIBlock";
import { postDashboardInsights } from "@/lib/api";
import type {
  AIStatus,
  DashboardInsightsRequest,
  DashboardInsightsResponse,
} from "@/lib/types";

interface Props {
  request: DashboardInsightsRequest;
}

export function DashboardInsights({ request }: Props) {
  const [status, setStatus] = useState<AIStatus>("loading");
  const [data, setData] = useState<DashboardInsightsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = useCallback(async () => {
    setStatus("loading");
    setError(null);
    try {
      const res = await postDashboardInsights(request);
      setData(res);
      setStatus("ok");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not load insights.");
      setStatus("error");
    }
  }, [request]);

  useEffect(() => {
    fetchInsights();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ marginBottom: "10px" }}>
      <h3
        className="serif"
        style={{ fontSize: "20px", fontWeight: 400, color: "var(--t)", marginBottom: "14px" }}
      >
        Where you stand
      </h3>

      <AIBlock
        status={status}
        error={error ?? undefined}
        onRetry={fetchInsights}
        skeletonLines={3}
      >
        {data && (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {/* Clarity summary */}
            <div
              style={{
                padding: "16px 20px",
                background: "var(--s1)",
                border: "1px solid var(--b)",
                borderRadius: "12px",
              }}
            >
              <p className="label" style={{ marginBottom: "6px" }}>
                Current position
              </p>
              <p style={{ fontSize: "14px", color: "var(--t)", lineHeight: 1.55 }}>
                {data.clarity_summary}
              </p>
            </div>

            {/* What to do next */}
            <div
              style={{
                padding: "16px 20px",
                background: "var(--s1)",
                border: "1px solid var(--b)",
                borderRadius: "12px",
              }}
            >
              <p className="label" style={{ marginBottom: "6px" }}>
                Next step
              </p>
              <p style={{ fontSize: "14px", color: "var(--t)", lineHeight: 1.55 }}>
                {data.what_to_do_next}
              </p>
            </div>

            {/* Profile gaps */}
            {data.profile_gaps && data.profile_gaps.length > 0 && (
              <div
                style={{
                  padding: "16px 20px",
                  background: "var(--s1)",
                  border: "1px solid var(--b)",
                  borderRadius: "12px",
                }}
              >
                <p className="label" style={{ marginBottom: "8px" }}>
                  Profile gaps
                </p>
                <ul style={{ margin: 0, paddingLeft: "18px", display: "flex", flexDirection: "column", gap: "4px" }}>
                  {data.profile_gaps.map((gap, i) => (
                    <li key={i} style={{ fontSize: "13px", color: "var(--t3)", lineHeight: 1.5 }}>
                      {gap}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Portfolio insight */}
            {data.portfolio_insight && (
              <div
                style={{
                  padding: "14px 20px",
                  background: "var(--s1)",
                  border: "1px solid var(--b)",
                  borderRadius: "12px",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <p className="label" style={{ flexShrink: 0 }}>Portfolio</p>
                <p style={{ fontSize: "13px", color: "var(--t3)", lineHeight: 1.5 }}>
                  {data.portfolio_insight}
                </p>
              </div>
            )}
          </div>
        )}
      </AIBlock>
    </div>
  );
}
