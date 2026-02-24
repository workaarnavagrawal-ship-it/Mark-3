import type { CourseDetail, CourseListItem, OfferAssessRequest, OfferAssessResponse, UniversityItem } from "./types";

const BASE = "/api/py";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, init);
  if (!res.ok) {
    const text = await res.text().catch(() => "Unknown error");
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json();
}

export const getUniversities = () => apiFetch<UniversityItem[]>("/universities");
export const getCourses = (university_id?: string) =>
  apiFetch<CourseListItem[]>(`/courses${university_id ? `?university_id=${university_id}` : ""}`);
export const getCourseDetail = (course_id: string) =>
  apiFetch<CourseDetail>(`/course/${course_id}`);
export const postOfferAssess = (body: OfferAssessRequest) =>
  apiFetch<OfferAssessResponse>("/assess", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

// ── Course suggestion (strategy page) ────────────────────────────
// ASSUMPTION: endpoint /api/py/suggest accepts SuggestRequest
export const postSuggest = (body: import("./types").SuggestRequest) =>
  apiFetch<import("./types").SuggestResponse>("/suggest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

// ── PS analysis ──────────────────────────────────────────────────
// ASSUMPTION: endpoint /api/py/analyse_ps accepts { statement, lines, format }
export const postAnalysePS = (body: {
  statement: string;
  lines: string[];
  format: string;
}) =>
  apiFetch<import("./types").PSAnalysisResponse>("/analyse_ps", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

// ── Course search ────────────────────────────────────────────────
export const searchCourses = (query: string) =>
  apiFetch<import("./types").CourseListItem[]>(`/courses?query=${encodeURIComponent(query)}`);
