import { createClient } from "@/lib/supabase/server";
import { ExploreClient } from "@/components/dashboard/ExploreClient";
import { DEMO_PROFILE } from "@/lib/demo";

export default async function ExplorePage() {
  let interests = DEMO_PROFILE.interest_tags;
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from("profiles").select("interests").eq("user_id", user.id).single();
      if (profile?.interests) interests = profile.interests;
    }
  } catch {}
  return <ExploreClient interests={interests} />;
}
