import { createClient } from "@/lib/supabase/server";
import { StrategyClient } from "@/components/my-space/StrategyClient";
import { DEMO_PROFILE } from "@/lib/demo";
import type { ProfileV2 } from "@/lib/types";

export default async function StrategyPage() {
  let profile: ProfileV2 = DEMO_PROFILE;
  let assessments: any[] = [];
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: p } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
      if (p?.persona) profile = p as ProfileV2;
      const { data: a } = await supabase.from("assessments").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      assessments = a || [];
    }
  } catch {}
  return <StrategyClient profile={profile} existingAssessments={assessments} />;
}
