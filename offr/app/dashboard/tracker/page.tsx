import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TrackerClient } from "@/components/dashboard/TrackerClient";

export default async function TrackerPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");
  const { data: profile } = await supabase.from("profiles").select("id").eq("user_id", user.id).single();
  if (!profile) redirect("/onboarding");
  const { data: assessments } = await supabase.from("assessments").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
  return <TrackerClient initialAssessments={assessments || []} />;
}
