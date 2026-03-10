import { createClient } from "@/lib/supabase/server";
import { ProfileClient } from "@/components/dashboard/ProfileClient";
import { DEMO_PROFILE } from "@/lib/demo";

export default async function ProfilePage() {
  let profile: any = DEMO_PROFILE;
  let subjects: any[] = [];
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: p } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
      if (p) profile = p;
      const { data: s } = await supabase.from("subjects").select("*").eq("profile_id", profile.id).order("level");
      subjects = s || [];
    }
  } catch {}
  return <ProfileClient profile={profile} subjects={subjects} />;
}
