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

// ── PS analysis (legacy — /api/py/analyse_ps) ────────────────────────
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

// ── PS Evaluate (new hardened endpoint — /api/py/ps-evaluate) ────────
/**
 * Typed client for POST /api/py/ps-evaluate.
 * Returns the raw response object (PSEvaluateSuccess | PSEvaluateError).
 * Never throws — caller must check result.status === "ok" | "error".
 */
export async function psEvaluate(
  body: import("./types").PSEvaluateRequest
): Promise<import("./types").PSEvaluateResponse> {
  const res = await fetch(`${BASE}/ps-evaluate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  // Always parse JSON — the endpoint returns structured errors on 4xx/5xx too
  let data: import("./types").PSEvaluateResponse;
  try {
    data = await res.json();
  } catch {
    // Completely unparseable body (shouldn't happen, but guard anyway)
    return {
      status: "error",
      error_code: "PARSE_ERROR",
      message: `Server returned an unparseable response (HTTP ${res.status}).`,
      retryable: true,
      request_id: "",
      details: null,
    };
  }
  return data;
}

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

// ── New Monologue endpoints (Phase 1) ────────────────────────────

/** GET /api/py/universities — with offering_count */
export const getUniversitiesV2 = () =>
  apiFetch<import("./types").UniversityEntry[]>("/universities");

/** GET /api/py/offerings?uni_code=&query= */
export const getOfferings = (params?: { uni_code?: string; query?: string }) => {
  const sp = new URLSearchParams();
  if (params?.uni_code) sp.set("uni_code", params.uni_code);
  if (params?.query) sp.set("query", params.query);
  const qs = sp.toString();
  return apiFetch<import("./types").OfferingLight[]>(`/offerings${qs ? `?${qs}` : ""}`);
};

/** GET /api/py/offerings/{course_id} */
export const getOfferingDetail = (course_id: string) =>
  apiFetch<import("./types").Offering>(`/offerings/${encodeURIComponent(course_id)}`);

/** GET /api/py/course-groups?query= */
export const getCourseGroups = (query?: string) =>
  apiFetch<import("./types").CourseGroup[]>(
    `/course-groups${query ? `?query=${encodeURIComponent(query)}` : ""}`
  );

const _cgDetailCache = new Map<string, import("./types").CourseGroupDetail>();

/** GET /api/py/course-groups/{key} — session-cached */
export async function getCourseGroupDetail(
  key: string
): Promise<import("./types").CourseGroupDetail> {
  if (_cgDetailCache.has(key)) return _cgDetailCache.get(key)!;
  const d = await apiFetch<import("./types").CourseGroupDetail>(
    `/course-groups/${encodeURIComponent(key)}`
  );
  _cgDetailCache.set(key, d);
  return d;
}

/** POST /api/py/recommend */
export const postRecommend = (body: import("./types").RecommendRequest) =>
  apiFetch<import("./types").RecommendResponse>("/recommend", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

/** GET /api/py/data-quality */
export const getDataQuality = () =>
  apiFetch<import("./types").DataQualityReport>("/data-quality");

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

// ── Strategy choices (Next.js API, Supabase-backed) ───────────────

export const listStrategyChoices = () =>
  shortlistFetch<import("./types").StrategyChoice[]>("/api/strategy");

export const upsertStrategySlot = (
  body: Omit<import("./types").StrategyChoice, "id">
) =>
  shortlistFetch<import("./types").StrategyChoice>("/api/strategy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

export const clearStrategySlot = (slot: number) =>
  shortlistFetch<{ success: true }>(`/api/strategy/${slot}`, {
    method: "DELETE",
  });

// ── Shortlist items (new richer shortlist) ────────────────────────

export const listShortlistItems = () =>
  shortlistFetch<import("./types").ShortlistItem[]>("/api/shortlist-items");

export const addShortlistItem = (
  body: Omit<import("./types").ShortlistItem, "id" | "user_id" | "created_at">
) =>
  shortlistFetch<import("./types").ShortlistItem>("/api/shortlist-items", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

export const removeShortlistItem = (id: string) =>
  shortlistFetch<{ success: true }>(`/api/shortlist-items/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
