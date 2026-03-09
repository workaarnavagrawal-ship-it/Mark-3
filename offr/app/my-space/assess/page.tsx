import { createClient } from "@/lib/supabase/server";
import { AssessClient } from "@/components/dashboard/AssessClient";
import { DEMO_PROFILE } from "@/lib/demo";

export default async function AssessPage() {
  let profile: any = DEMO_PROFILE;
  let subjects: any[] = [];
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: p } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
      if (p) profile = p;
      const { data: s } = await supabase.from("subjects").select("*").eq("profile_id", profile.id);
      subjects = s || [];
    }
  } catch {}
  return <AssessClient profile={profile} subjects={subjects} />;
}
