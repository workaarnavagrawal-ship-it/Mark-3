// ── Shared AI types ──────────────────────────────────────────────
// Mirror of api/ai_service.py AIError.to_dict() and AIBlock component types.

export type AIStatus = "idle" | "loading" | "ok" | "error";

export interface AIErrorPayload {
  status: "error";
  error_code: string;
  message: string;
  retryable: boolean;
  details?: Record<string, unknown>;
}

// ── Profile ─────────────────────────────────────────────────────
export type Curriculum = "IB" | "A_LEVELS";
export type YearGroup = "11" | "12";
export type HomeOrIntl = "home" | "intl";

export interface SubjectEntry {
  id?: string;
  subject: string;
  level: "HL" | "SL" | "A_LEVEL";
  predicted_grade: string; // "7", "A*", etc.
  current_grade?: string;
}

export interface Profile {
  id: string;
  user_id: string;
  name: string;
  year: YearGroup;
  curriculum: Curriculum;
  home_or_intl: HomeOrIntl;
  interests: string[]; // max 3
  core_points?: number; // IB EE+TOK
  ps_q1?: string;
  ps_q2?: string;
  ps_q3?: string;
  ps_format?: "UCAS_3Q" | "LEGACY";
  ps_statement?: string;
  ps_last_analysis?: PSAnalysisResponse;
  created_at?: string;
  updated_at?: string;
}

export interface ProfileWithSubjects extends Profile {
  subjects: SubjectEntry[];
}

// ── Assessment (offer tracker) ────────────────────────────────────
export interface TrackerEntry {
  id?: string;
  user_id: string;
  course_id: string;
  course_name: string;
  university_id: string;
  university_name: string;
  band: "Safe" | "Target" | "Reach";
  chance_percent: number;
  result_json: Record<string, any>;
  label?: string; // "Firm choice", "Insurance", etc.
  created_at?: string;
}

// ── API types (backend) ──────────────────────────────────────────
export interface UniversityItem {
  university_id: string;
  university_name: string;
}

export interface CourseListItem {
  university_id: string;
  course_id: string;
  course_name: string;
  faculty: string;
  degree_type: string;
  estimated_annual_cost_international?: number;
  min_requirements?: string;
}

export interface CourseDetail extends CourseListItem {
  typical_offer?: string;
  required_subjects?: string;
  course_url?: string;
  ps_expected_signals?: string;
}

// ── Explore / Unique courses ────────────────────────────────────────

export interface UniqueCourse {
  course_key: string;
  course_name: string;
  universities_count: number;
  universities: { university_id: string; university_name: string }[];
  faculties: string[];
  degree_types: string[];
  min_entry_hint?: string;
}

export interface UniqueCourseOffering {
  course_id: string;
  university_id: string;
  university_name: string;
  typical_offer?: string;
  required_subjects?: string;
  course_url?: string;
  estimated_annual_cost_international?: number | null;
  min_requirements?: string | null;
}

export interface UniqueCourseDetail {
  course: UniqueCourse;
  offerings: UniqueCourseOffering[];
}

export interface IBSubject { subject: string; grade: number; }
export interface ALevelItem { subject: string; grade: string; }

export interface IBInput {
  core_points: number;
  hl: IBSubject[];
  sl: IBSubject[];
  total_points: number;
}

export interface ALevelInput { predicted: ALevelItem[]; }

export interface PsInput {
  format: "UCAS_3Q" | "LEGACY";
  rewrite_mode?: boolean;
  q1?: string; q2?: string; q3?: string;
  statement?: string;
}

export interface OfferAssessRequest {
  course_id: string;
  home_or_intl: HomeOrIntl;
  curriculum: Curriculum;
  ib?: IBInput;
  a_levels?: ALevelInput;
  ps?: PsInput | null;
  university?: string;
}

export interface OfferAssessResponse {
  verdict: string;
  band: "Safe" | "Target" | "Reach";
  chance_percent: number;
  course: {
    course_id?: string;
    course_name?: string;
    faculty?: string;
    min_requirements?: string;
    estimated_annual_cost_international?: number;
    course_url?: string;
  };
  checks: { passed: string[]; failed: string[] };
  competitiveness: {
    threshold_used?: number;
    margin?: number;
    score: number;
    score_breakdown?: any[];
  };
  counsellor: {
    strengths: string[];
    risks: string[];
    what_to_do_next: string[];
    notes: string[];
  };
  ps_analysis?: any;
  alternatives: {
    suggested_course_ids: string[];
    suggested_course_names: string[];
  };
  applicant_context?: {
    n: number;
    percentile: number;
    your_score?: number;
    your_sum?: number;
    curriculum: string;
    context: string;
  } | null;
}

// ── Persona ──────────────────────────────────────────────────────
export type Persona = "explorer" | "optimizer" | "verifier";

// ── Strategy / Suggest ───────────────────────────────────────────
export interface SuggestRequest {
  interests: string[];
  curriculum: string;
  exclude_course_names?: string[];
  top_n?: number;
}

export interface SuggestCourse {
  course_name: string;
  universities_count: number;
  faculties: string[];
  reason: string;
  tradeoff?: string;   // AI-generated tradeoff note (may be absent if fallback)
}

export interface SuggestResponse {
  status: "ok" | "error";
  suggestions: SuggestCourse[];
  portfolio_strategy: string | null;
  provider_meta?: { latency_ms: number };
  // error fields
  error_code?: string;
  message?: string;
  retryable?: boolean;
}

// ── Portfolio advice ─────────────────────────────────────────────
export interface PortfolioAdviceRequest {
  curriculum: string;
  interests: string[];
  bands: Record<string, number>;
  assessments: { course_name: string; university_name: string; band: string; chance_percent: number }[];
}

export interface PortfolioAdviceResponse {
  status: "ok" | "error";
  strategy_summary: string;
  risk_balance: string;
  actions: string[];
  provider_meta?: { latency_ms: number };
}

// ── Result page counterfactual ─────────────────────────────────────
export interface ResultCounterfactualRequest {
  band: string;
  chance_percent: number;
  course_name?: string | null;
  checks_passed?: string[];
  checks_failed?: string[];
  counsellor_strengths?: string[];
  counsellor_risks?: string[];
  has_ps?: boolean;
  ps_band?: string | null;
}

export interface ResultCounterfactualResponse {
  status: "ok" | "error";
  plain_english: string;
  if_grades_improve: string;
  if_ps_improves: string | null;
  confidence_note: string;
  key_actions: string[];
  provider_meta?: { latency_ms: number };
}

// ── What would improve ───────────────────────────────────────────
// Extends OfferAssessResponse — already partially present in result_json
export interface WhatWouldImprove {
  if_grades_improve: string;
  if_ps_improves: string;
  key_actions: string[];
}

// ── PS Line Feedback ─────────────────────────────────────────────
export interface PSLineFeedback {
  lineNumber: number;
  line: string;
  score: number; // 1–10
  verdict: "strong" | "weak" | "improve" | "neutral";
  feedback: string;
  suggestion?: string | null;
}

export interface PSAnalysisResponse {
  overallScore: number; // 0–100
  band: "Exceptional" | "Strong" | "Solid" | "Developing" | "Weak";
  summary: string;
  strengths: string[];
  weaknesses: string[];
  topPriority: string;
  lineFeedback: PSLineFeedback[];
}

// ── PS Evaluate (new hardened contract) ──────────────────────────────
export interface PSEvaluateRequest {
  personal_statement_text: string;  // required, min 300 chars
  target_course: string;            // required
  target_university?: string | null;
  curriculum?: "IB" | "ALEVEL" | null;
  grades_summary?: string | null;
  mode?: "standalone" | "assessment";
}

export interface PSRubricDimension {
  score: number;  // 0–20
  notes: string[];
}

export interface PSEvaluateSuccess {
  status: "ok";
  ps_band: "EXCEPTIONAL" | "STRONG" | "OK" | "WEAK";
  score: number;  // 0–100
  rubric: {
    course_fit: PSRubricDimension;
    specificity_and_evidence: PSRubricDimension;
    structure_and_coherence: PSRubricDimension;
    voice_and_authenticity: PSRubricDimension;
    reflection_and_growth: PSRubricDimension;
  };
  top_strengths: string[];
  top_improvements: string[];
  line_level_fixes: string[] | null;
  summary_reasoning: string;
  grade_compliment_note: string | null;
  impact_on_chances: {
    weight_class: "PS_HEAVY" | "PS_MED" | "PS_LIGHT" | "UNKNOWN";
    suggested_impact_points: number;
    rationale: string;
  };
  meta: {
    request_id: string;
    model: string;
    latency_ms: number;
  };
}

export interface PSEvaluateError {
  status: "error";
  error_code: string;
  message: string;
  retryable: boolean;
  request_id: string;
  details: Record<string, unknown> | null;
}

export type PSEvaluateResponse = PSEvaluateSuccess | PSEvaluateError;

// ── Dashboard AI insights ──────────────────────────────────────────
export interface DashboardInsightsRequest {
  curriculum: string;
  year: string;
  interests: string[];
  has_ps: boolean;
  has_subjects: boolean;
  assessments_count: number;
  bands: Record<string, number>;
  shortlisted_count: number;
  ib_score?: number | null;
  a_level_grades?: string[] | null;
}

export interface DashboardInsightsResponse {
  status: "ok" | "error";
  what_to_do_next: string;
  profile_gaps: string[];
  clarity_summary: string;
  portfolio_insight: string | null;
  provider_meta?: { latency_ms: number };
  // error fields (when status === "error")
  error_code?: string;
  message?: string;
  retryable?: boolean;
}

// ── Profile AI suggestions ────────────────────────────────────────────
export interface ProfileSuggestionsRequest {
  curriculum: string;
  year: string;
  interests_count: number;
  has_grades: boolean;
  has_ps: boolean;
  ps_length: number;
  ib_total?: number | null;
  a_level_count?: number | null;
}

export interface ProfileSuggestion {
  field: string;
  why: string;
  action: string;
}

export interface ProfileSuggestionsResponse {
  status: "ok" | "error";
  suggestions: ProfileSuggestion[];
  provider_meta?: { latency_ms: number };
}

// ── Tracker label suggestions ────────────────────────────────────────
export interface LabelSuggestionsRequest {
  entries: { course_name: string; university_name: string; band: string; chance_percent: number }[];
}

export interface LabelSuggestion {
  label: string;
  reason: string;
}

export interface LabelSuggestionsResponse {
  status: "ok" | "error";
  suggestions: Record<string, LabelSuggestion>;  // keyed by course_name
  provider_meta?: { latency_ms: number };
}

// ── Explore: Hidden gems & shortlist ────────────────────────────────

export interface HiddenGemRecommendation {
  course: UniqueCourse;
  reason: string;
}

export interface ShortlistedCourse {
  course_key: string;
  course_name: string;
  universities_count: number;
  created_at: string;
}
