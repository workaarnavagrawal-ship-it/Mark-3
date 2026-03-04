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
export type HomeOrIntl = "home" | "intl" | "HOME" | "INTL";

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
  // Monologue persona
  persona?: PersonaCode;
  // IB score breakdown
  ib_subject_total?: number | null;
  ib_bonus_points?: number | null;
  ib_total_points?: number | null;
  // A-Level predicted grades (map: subject → grade)
  alevel_predicted?: Record<string, string> | null;
  // Interests
  interests: string[]; // max 3 (legacy)
  interest_tags?: string[]; // structured interest tags
  core_points?: number; // IB EE+TOK (legacy — use ib_bonus_points)
  // PS
  ps_q1?: string;
  ps_q2?: string;
  ps_q3?: string;
  ps_format?: "UCAS_3Q" | "LEGACY";
  ps_statement?: string;
  ps_last_analysis?: PSAnalysisResponse;
  // Context
  interests_text?: string;
  extracurriculars?: string[];
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
  curriculum?: "IB" | "A_LEVELS" | null;
  grades_summary?: string | null;
  mode?: "standalone" | "assessment";
  interests_text?: string | null;
  extracurriculars?: string[] | null;
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

// ─────────────────────────────────────────────────────────────────────
// New Monologue data types (Phase 1 contracts)
// ─────────────────────────────────────────────────────────────────────

/** Full course offering — one CSV row, cleaned. */
export interface Offering {
  course_id: string;
  university_id: string;
  university_name: string;
  faculty: string;
  course_name: string;
  degree_type: string;
  course_url: string;
  curriculum_supported: string;
  typical_offer: string;
  min_requirements: string;
  min_points_home: number | null;
  intl_buffer_points: number | null;
  required_subjects: string;
  recommended_subjects: string;
  ps_expected_signals: string;
  estimated_annual_cost_international: number | null;
  notes: string;
}

/** Light version returned by list endpoints. */
export interface OfferingLight {
  course_id: string;
  university_id: string;
  university_name: string;
  faculty: string;
  course_name: string;
  degree_type: string;
  typical_offer: string;
  min_points_home: number | null;
  estimated_annual_cost_international: number | null;
  course_url: string;
}

/** University with offering count. */
export interface UniversityEntry {
  uni_code: string;
  uni_name: string;
  university_id: string;       // backward compat
  university_name: string;     // backward compat
  offering_count: number;
}

/** Deduped course group (one per logical course across all unis). */
export interface CourseGroup {
  course_group_key: string;
  course_group_name: string;
  offerings_count: number;
  offerings_preview: string[];  // up to 3 uni names
  representative_faculty: string;
}

/** Full course group detail with all offerings. */
export interface CourseGroupDetail {
  group: CourseGroup;
  offerings: Offering[];
}

/** CSV data quality report. */
export interface DataQualityReport {
  total_rows_in_file: number;
  rows_loaded: number;
  fixed_case_c: number;
  fixed_case_a: number;
  fixed_case_b: number;
  dropped: number;
  dropped_course_ids: string[];
  fix_details: { course_id: string; fix_type: string; original_course_name: string; fixed_course_name: string }[];
}

// ── Recommend (Explorer Clarity Session) ──────────────────────────────

export interface RecommendRequest {
  curriculum: "IB" | "A_LEVELS";
  home_or_intl?: "HOME" | "INTL";
  ib_total_points?: number | null;
  alevel_predicted_summary?: string | null;
  optimize_for?: "PRESTIGE" | "BUDGET" | "BALANCE";
  vibe_tags?: string[];
  location_tags?: string[];
  interest_tags?: string[];
  free_text?: string | null;
  top_n?: number;
  exclude_course_ids?: string[];
}

export interface RecommendedOffering extends OfferingLight {
  fit_score: number;
  reasons: string[];
  required_subjects: string;
  ps_expected_signals: string;
  notes: string;
  ai_note: string | null;
}

export interface RecommendResponse {
  status: "ok" | "error";
  recommendations: RecommendedOffering[];
  total_pool: number;
  ai_enhanced: boolean;
}

// ── Assess (extended contract) ─────────────────────────────────────────

export interface AssessResult {
  band: "Safe" | "Target" | "Reach";
  chance: number;
  fit_score: number;
  grade_match: number;
  subject_match: number | null;
  ps_impact: number | null;
  reasoning: {
    bullets: string[];
    grade_note: string | null;
    subject_note: string | null;
  };
}

// ── Persona ────────────────────────────────────────────────────────────
export type PersonaCode = "EXPLORER" | "STRATEGIST" | "FINISHER";

// ── Profile (new, extended shape) ─────────────────────────────────────
export interface ProfileNew {
  user_id: string;
  name: string;
  persona: PersonaCode;
  curriculum: "IB" | "ALEVEL";
  home_or_intl: "HOME" | "INTL";
  predicted_summary: string | null;
  ib_subject_total: number | null;
  ib_bonus_points: number | null;
  ib_total_points: number | null;
  alevel_predicted: Record<string, string> | null;
  interest_tags: string[];
  created_at?: string;
  updated_at?: string;
}

// ── Strategy choice ────────────────────────────────────────────────────
export interface StrategyChoice {
  id?: string;
  user_id: string;
  slot: 1 | 2 | 3 | 4 | 5;
  course_id: string;
  university_name: string;
  course_name: string;
  notes?: string | null;
}

// ── Shortlist item (new shape) ─────────────────────────────────────────
export interface ShortlistItem {
  id?: string;
  user_id: string;
  item_type: "COURSE_GROUP" | "OFFERING";
  course_group_key?: string | null;
  course_id?: string | null;
  course_name: string;
  university_name?: string | null;
  reason?: string | null;
  fit_score?: number | null;
  created_at?: string;
}

// ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ──
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
