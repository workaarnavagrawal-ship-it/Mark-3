import { createClient } from "@/lib/supabase/server";
import { MySpaceClient } from "@/components/my-space/MySpaceClient";
import { DEMO_PROFILE } from "@/lib/demo";
import type { ProfileV2 } from "@/lib/types";

export default async function MySpacePage() {
  let profile: ProfileV2 = DEMO_PROFILE;
  let assessmentCount = 0;
  let shortlistCount = 0;
  let hasPS = false;
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: p } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
      if (p?.persona) profile = p as ProfileV2;
      hasPS = !!(p?.ps_q1 || p?.ps_statement);
      const { count: ac } = await supabase.from("assessments").select("*", { count: "exact", head: true }).eq("user_id", user.id);
      assessmentCount = ac ?? 0;
      const { count: sc } = await supabase.from("shortlisted_courses").select("*", { count: "exact", head: true }).eq("user_id", user.id);
      shortlistCount = sc ?? 0;
    }
  } catch {}
  return <MySpaceClient profile={profile} assessmentCount={assessmentCount} shortlistCount={shortlistCount} hasPS={hasPS} />;
}
