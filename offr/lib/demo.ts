import type { PersonaV2, ProfileV2 } from "./types";

/**
 * Demo profile used when auth is skipped (no Supabase user).
 * Allows the app to render fully for demos and deploys.
 */
export const DEMO_PROFILE: ProfileV2 = {
  id: "demo",
  user_id: "demo",
  name: "Demo",
  persona: "STRATEGIST" as PersonaV2,
  curriculum: "IB",
  home_or_intl: "INTL",
  predicted_summary: "IB 38/45",
  ib_subject_total: 35,
  ib_bonus_points: 3,
  ib_total_points: 38,
  alevel_predicted: null,
  interest_tags: ["Economics", "Computer Science", "Mathematics"],
};

export const DEMO_USER_ID = "demo";
