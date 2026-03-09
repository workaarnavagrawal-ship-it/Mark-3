import { createClient } from "@/lib/supabase/server";
import { StrategyClient } from "@/components/dashboard/StrategyClient";
import { DEMO_PROFILE } from "@/lib/demo";

export default async function StrategyPage() {
  let profile: any = DEMO_PROFILE;
  let subjects: any[] = [];
  let assessments: any[] = [];
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: p } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
      if (p) profile = p;
      const { data: s } = await supabase.from("subjects").select("*").eq("profile_id", profile.id);
      subjects = s || [];
      const { data: a } = await supabase.from("assessments").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      assessments = a || [];
    }
  } catch {}
  return <StrategyClient profile={profile} subjects={subjects} assessments={assessments} />;
}
