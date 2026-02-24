import type { OfferAssessResponse } from "./types";

const KEY = "offr_last_result";

export function saveAssessment(data: OfferAssessResponse) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(KEY, JSON.stringify(data));
}

export function loadAssessment(): OfferAssessResponse | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
