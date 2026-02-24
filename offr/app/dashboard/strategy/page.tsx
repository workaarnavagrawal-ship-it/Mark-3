import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { StrategyClient } from "@/components/dashboard/StrategyClient";

export default async function StrategyPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");
  const { data: profile } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
  if (!profile) redirect("/onboarding");
  const { data: subjects } = await supabase.from("subjects").select("*").eq("profile_id", profile.id);
  const { data: assessments } = await supabase.from("assessments").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
  return <StrategyClient profile={profile} subjects={subjects || []} assessments={assessments || []} />;
}
