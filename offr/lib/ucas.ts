import type { DeadlineConfig } from "./types";

/**
 * UCAS deadline configuration.
 * Do NOT hardcode specific year dates — labels only.
 * The actual dates change each cycle; update labels here.
 */
export const DEADLINE_CONFIG: DeadlineConfig = {
  early_deadline_label: "Early deadline window (Oxbridge / Medicine / Dentistry / Vet Medicine)",
  main_deadline_label: "Main equal-consideration deadline",
  early_applies_to: [
    "OXF", "CAM",
    // Course-name keywords that trigger early deadline awareness
    "medicine", "dentistry", "veterinary",
  ],
};

/**
 * Med/Dent/Vet constraint: max 4 choices in these subjects + 1 other.
 * Warn but don't block.
 */
export const MED_DENT_VET_KEYWORDS = [
  "medicine", "dentistry", "dental", "veterinary", "veterinary medicine",
];

export const UCAS_MAX_CHOICES = 5;
export const MED_DENT_VET_MAX = 4;

/**
 * Check if a course_id or course_name triggers the early deadline window.
 */
export function isEarlyDeadline(courseId: string, courseName: string): boolean {
  const prefix = courseId.split("-")[0]?.toUpperCase() ?? "";
  if (DEADLINE_CONFIG.early_applies_to.includes(prefix)) return true;
  const lower = courseName.toLowerCase();
  return DEADLINE_CONFIG.early_applies_to.some(
    (kw) => typeof kw === "string" && lower.includes(kw.toLowerCase())
  );
}

/**
 * Check if a course name matches med/dent/vet constraints.
 */
export function isMedDentVet(courseName: string): boolean {
  const lower = courseName.toLowerCase();
  return MED_DENT_VET_KEYWORDS.some((kw) => lower.includes(kw));
}

/**
 * Given a list of course names in strategy slots, return a warning if
 * more than 4 are med/dent/vet.
 */
export function checkMedDentVetConstraint(courseNames: string[]): string | null {
  const mdvCount = courseNames.filter(isMedDentVet).length;
  if (mdvCount > MED_DENT_VET_MAX) {
    return `UCAS allows max ${MED_DENT_VET_MAX} Medicine/Dentistry/Vet choices — you have ${mdvCount}. Consider using your 5th slot for a different subject.`;
  }
  return null;
}
