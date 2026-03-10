import { createClient } from "@/lib/supabase/server";
import { DEMO_PROFILE } from "@/lib/demo";
import { MySpaceClient } from "@/components/my-space/MySpaceClient";
import type { ProfileV2 } from "@/lib/types";

export default async function MySpacePage() {
  let p: ProfileV2 = DEMO_PROFILE;
  let assessmentCount = 0;
  let shortlistCount = 0;
  let hasPS = false;

  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();
      if (profile?.persona) p = profile as ProfileV2;

      hasPS = !!(profile?.ps_q1 || profile?.ps_statement);

      const { count: aCount } = await supabase
        .from("assessments")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);
      assessmentCount = aCount ?? 0;

      const { count: slCount } = await supabase
        .from("shortlisted_courses")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);
      shortlistCount = slCount ?? 0;
    }
  } catch {
    // No auth — demo defaults
  }

  return (
    <MySpaceClient
      profile={p}
      assessmentCount={assessmentCount}
      shortlistCount={shortlistCount}
      hasPS={hasPS}
    />
  );
}
