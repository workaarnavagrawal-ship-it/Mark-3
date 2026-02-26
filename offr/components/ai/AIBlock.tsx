"use client";

/**
 * AIBlock — shared shell for any AI-powered section.
 *
 * Handles loading / error / result states in one place so every page that
 * calls an AI endpoint gets consistent UX without duplicating state logic.
 *
 * Usage:
 *   <AIBlock status={status} error={error} onRetry={retry} skeletonLines={4}>
 *     <MyResult data={data} />
 *   </AIBlock>
 */

import { ReactNode } from "react";
import { LoadingSkeleton } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";

export type AIStatus = "idle" | "loading" | "ok" | "error";

export interface AIErrorPayload {
  error_code: string;
  message: string;
  retryable: boolean;
}

interface AIBlockProps {
  status: AIStatus;
  /** Error payload from the API, or a plain string message. */
  error?: AIErrorPayload | string | null;
  /** Called when the user clicks "Try again". Only shown when error.retryable or always for string errors. */
  onRetry?: () => void;
  /** Number of skeleton lines shown while loading (default 4). */
  skeletonLines?: number;
  children?: ReactNode;
}

function errorMessage(error: AIErrorPayload | string): string {
  if (typeof error === "string") return error;
  return error.message || "Something went wrong. Please try again.";
}

function isRetryable(error: AIErrorPayload | string | null | undefined, onRetry?: () => void): boolean {
  if (!onRetry) return false;
  if (!error || typeof error === "string") return !!onRetry;
  return error.retryable;
}

export function AIBlock({ status, error, onRetry, skeletonLines = 4, children }: AIBlockProps) {
  if (status === "loading") {
    return (
      <div style={{ padding: "4px 0" }}>
        <LoadingSkeleton lines={skeletonLines} />
      </div>
    );
  }

  if (status === "error" && error) {
    return (
      <ErrorState
        message={errorMessage(error)}
        onRetry={isRetryable(error, onRetry) ? onRetry : undefined}
      />
    );
  }

  // "idle" or "ok" — render children (or nothing for idle with no children)
  return <>{children}</>;
}
