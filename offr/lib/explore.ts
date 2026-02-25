import type { HiddenGemRecommendation, UniqueCourse } from "./types";

/**
 * Deterministic hidden gem recommendations.
 *
 * Logic: each interest term is expanded into related keywords. Every
 * UniqueCourse is scored by how many keywords match its name or faculties.
 * Top-scoring courses (not already trivially obvious by name) are returned
 * with a transparent reason string.
 *
 * No randomness — same inputs always produce same output.
 * If interests are empty or no courses match, returns [].
 */

// Map from a user interest label → keywords to match against course/faculty text.
// Case-insensitive substring matching.
const INTEREST_KEYWORDS: Record<string, string[]> = {
  // Social sciences
  politics: ["politics", "political", "government", "governance", "international relations", "public policy", "policy", "diplomacy"],
  economics: ["economics", "economic", "finance", "financial", "business", "management", "accounting", "banking", "commerce"],
  sociology: ["sociology", "sociolog", "social", "anthropolog", "human geograph", "development studies", "cultural"],
  psychology: ["psychology", "psycholog", "cognitive", "neuroscience", "behavioural", "behavioral", "mental health", "counselling"],
  law: ["law", "legal", "criminology", "criminal justice", "jurisprudence"],
  history: ["history", "histor", "archaeology", "classics", "ancient", "medieval", "heritage"],
  philosophy: ["philosophy", "ethics", "logic", "moral"],
  geography: ["geography", "geograph", "environmental", "urban planning", "urban studies", "sustainability", "climate"],

  // STEM
  mathematics: ["mathematics", "maths", "math", "statistics", "statistical", "actuarial", "data science", "quantitative"],
  physics: ["physics", "astrophysics", "astronomy", "cosmology", "quantum"],
  chemistry: ["chemistry", "chemical", "biochemistry", "pharmaceutical", "pharmacology", "materials science"],
  biology: ["biology", "biological", "ecology", "zoology", "botany", "genetics", "microbiology", "neuroscience", "anatomy"],
  engineering: ["engineering", "engineer", "mechanical", "civil", "electrical", "electronic", "aerospace", "structural"],
  "computer science": ["computer science", "computing", "software", "artificial intelligence", "machine learning", "data", "cybersecurity", "information technology"],
  medicine: ["medicine", "medical", "dentistry", "nursing", "healthcare", "health science", "biomedical", "pharmacy", "physiotherapy"],

  // Arts & humanities
  english: ["english literature", "english language", "literature", "creative writing", "linguistics", "journalism", "media"],
  languages: ["languages", "modern languages", "french", "spanish", "german", "chinese", "japanese", "arabic", "translation", "linguistics"],
  art: ["art", "fine art", "design", "architecture", "fashion", "illustration", "film", "photography", "theatre", "drama", "music", "performing arts"],
  "business studies": ["business", "management", "marketing", "entrepreneurship", "commerce", "accounting", "finance", "economics"],

  // Catch-all for interests not in the map (uses the raw term as keyword)
};

function getKeywords(interest: string): string[] {
  const lower = interest.toLowerCase().trim();
  // Exact match
  if (INTEREST_KEYWORDS[lower]) return INTEREST_KEYWORDS[lower];
  // Partial key match
  for (const key of Object.keys(INTEREST_KEYWORDS)) {
    if (lower.includes(key) || key.includes(lower)) return INTEREST_KEYWORDS[key];
  }
  // Fallback: use the raw term itself
  return [lower];
}

function scoreMatch(
  course: UniqueCourse,
  allKeywords: string[],
): { score: number; matchedKeywords: string[] } {
  const text = [course.course_name, ...course.faculties].join(" ").toLowerCase();
  const matched: string[] = [];
  for (const kw of allKeywords) {
    if (text.includes(kw) && !matched.includes(kw)) matched.push(kw);
  }
  return { score: matched.length, matchedKeywords: matched };
}

function buildReason(interest: string, matchedKeywords: string[]): string {
  // Find the cleanest display keyword (longest meaningful match)
  const clean = matchedKeywords
    .filter((k) => k.length > 3)
    .sort((a, b) => b.length - a.length)[0] || interest;
  return `Matches your interest in ${interest} — based on "${clean}" alignment`;
}

export function computeHiddenGems(
  interests: string[],
  courses: UniqueCourse[],
  maxResults = 5,
): HiddenGemRecommendation[] {
  if (!interests.length || !courses.length) return [];

  // Build combined keyword set across all interests, keeping track of which
  // interest each keyword came from so we can generate honest reason text.
  type ScoredCourse = {
    course: UniqueCourse;
    score: number;
    topInterest: string;
    matchedKeywords: string[];
  };

  const scored: ScoredCourse[] = [];

  for (const course of courses) {
    let bestScore = 0;
    let bestInterest = "";
    let bestMatched: string[] = [];

    for (const interest of interests) {
      const keywords = getKeywords(interest);
      const { score, matchedKeywords } = scoreMatch(course, keywords);
      if (score > bestScore) {
        bestScore = score;
        bestInterest = interest;
        bestMatched = matchedKeywords;
      }
    }

    if (bestScore > 0) {
      scored.push({
        course,
        score: bestScore,
        topInterest: bestInterest,
        matchedKeywords: bestMatched,
      });
    }
  }

  // Sort by score desc, then alphabetically for determinism
  scored.sort((a, b) => b.score - a.score || a.course.course_name.localeCompare(b.course.course_name));

  // Take top results, deduplicate by course_key
  const seen = new Set<string>();
  const results: HiddenGemRecommendation[] = [];
  for (const s of scored) {
    if (seen.has(s.course.course_key)) continue;
    seen.add(s.course.course_key);
    results.push({
      course: s.course,
      reason: buildReason(s.topInterest, s.matchedKeywords),
    });
    if (results.length >= maxResults) break;
  }

  return results;
}
