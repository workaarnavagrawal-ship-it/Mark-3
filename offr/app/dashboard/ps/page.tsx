import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PSAnalyserClient } from "@/components/dashboard/PSAnalyserClient";
import type { PersonaCode } from "@/lib/types";

export default async function PSPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");
  const { data: profile } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
  if (!profile) redirect("/onboarding");
  const persona: PersonaCode = (profile.persona as PersonaCode) || "FINISHER";
  return <PSAnalyserClient profile={profile} persona={persona} />;
}
