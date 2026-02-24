import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ProfileClient } from "@/components/dashboard/ProfileClient";

export default async function ProfilePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");
  const { data: profile } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
  if (!profile) redirect("/onboarding");
  const { data: subjects } = await supabase.from("subjects").select("*").eq("profile_id", profile.id).order("level");
  return <ProfileClient profile={profile} subjects={subjects || []} />;
}
