import { createClient } from "@/lib/supabase/server";
import { PSAnalyserClient } from "@/components/dashboard/PSAnalyserClient";
import { DEMO_PROFILE } from "@/lib/demo";

export default async function PSPage() {
  let profile: any = DEMO_PROFILE;
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: p } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
      if (p) profile = p;
    }
  } catch {}
  return <PSAnalyserClient profile={profile} />;
}
