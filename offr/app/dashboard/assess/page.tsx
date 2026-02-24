import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AssessClient } from "@/components/dashboard/AssessClient";

export default async function AssessPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");
  const { data: profile } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
  if (!profile) redirect("/onboarding");
  const { data: subjects } = await supabase.from("subjects").select("*").eq("profile_id", profile.id);
  return <AssessClient profile={profile} subjects={subjects || []} />;
}
