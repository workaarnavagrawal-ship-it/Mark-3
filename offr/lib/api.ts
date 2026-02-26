import type {
  CourseDetail,
  CourseListItem,
  DashboardInsightsRequest,
  DashboardInsightsResponse,
  OfferAssessRequest,
  OfferAssessResponse,
  PortfolioAdviceRequest,
  PortfolioAdviceResponse,
  SuggestRequest,
  SuggestResponse,
  UniversityItem,
  UniqueCourse,
  UniqueCourseDetail,
  ShortlistedCourse,
} from "./types";

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

// ── Course suggestions (strategy > alternatives tab) ─────────────
export const postSuggest = (body: SuggestRequest) =>
  apiFetch<SuggestResponse>("/suggest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

// ── Portfolio advice (strategy > mix tab + tracker) ──────────────
export const postPortfolioAdvice = (body: PortfolioAdviceRequest) =>
  apiFetch<PortfolioAdviceResponse>("/portfolio_advice", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

// ── Dashboard AI insights ────────────────────────────────────
export const postDashboardInsights = (body: DashboardInsightsRequest) =>
  apiFetch<DashboardInsightsResponse>("/dashboard_insights", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

// ── Profile AI suggestions ────────────────────────────────────────
export const postProfileSuggestions = (body: import("./types").ProfileSuggestionsRequest) =>
  apiFetch<import("./types").ProfileSuggestionsResponse>("/profile_suggestions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

// ── Tracker label suggestions ────────────────────────────────────
export const postLabelSuggestions = (body: import("./types").LabelSuggestionsRequest) =>
  apiFetch<import("./types").LabelSuggestionsResponse>("/label_suggestions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

// ── Result counterfactual ─────────────────────────────────────────
export const postResultCounterfactual = (body: import("./types").ResultCounterfactualRequest) =>
  apiFetch<import("./types").ResultCounterfactualResponse>("/result_counterfactual", {
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

// ── Unique course listing (explore) ───────────────────────────────

export const getUniqueCourses = (query?: string) =>
  apiFetch<UniqueCourse[]>(`/unique_courses${query ? `?q=${encodeURIComponent(query)}` : ""}`);

// Module-level cache: course_key → detail (lives for the page session)
const _detailCache = new Map<string, UniqueCourseDetail>();

export async function getUniqueCourseDetail(course_key: string): Promise<UniqueCourseDetail> {
  if (_detailCache.has(course_key)) return _detailCache.get(course_key)!;
  const detail = await apiFetch<UniqueCourseDetail>(`/unique_courses/${encodeURIComponent(course_key)}`);
  _detailCache.set(course_key, detail);
  return detail;
}

// ── Shortlist (Next.js API, Supabase-backed) ─────────────────────

async function shortlistFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init);
  if (!res.ok) {
    const text = await res.text().catch(() => "Unknown error");
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json();
}

export const listShortlistedCourses = () =>
  shortlistFetch<ShortlistedCourse[]>("/api/shortlist");

export const addShortlistedCourse = (input: {
  course_key: string;
  course_name: string;
  universities_count: number;
}) =>
  shortlistFetch<ShortlistedCourse>("/api/shortlist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

export const removeShortlistedCourse = (course_key: string) =>
  shortlistFetch<{ success: true }>(`/api/shortlist/${encodeURIComponent(course_key)}`, {
    method: "DELETE",
  });
