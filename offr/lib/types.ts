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

// ── Strategy / Compare ───────────────────────────────────────────
// ASSUMPTION: backend returns this shape for /api/py/suggest
export interface SuggestRequest {
  course_id: string;
  university_id: string;
  interests: string[];
  curriculum: string;
}

export interface SuggestResponse {
  pivots: CourseListItem[];        // same course, different uni
  hidden_gems: CourseListItem[];   // less-known but well-matched
  adjacent: CourseListItem[];      // related subject areas
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
