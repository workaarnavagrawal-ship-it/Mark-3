import { createClient } from "@/lib/supabase/server";
import { TrackerClient } from "@/components/dashboard/TrackerClient";
import { DEMO_PROFILE } from "@/lib/demo";

export default async function TrackerPage() {
  let assessments: any[] = [];
  let curriculum = DEMO_PROFILE.curriculum;
  let interests = DEMO_PROFILE.interest_tags;
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from("profiles").select("id, curriculum, interests").eq("user_id", user.id).single();
      if (profile) {
        curriculum = profile.curriculum ?? "IB";
        interests = profile.interests ?? [];
      }
      const { data: a } = await supabase.from("assessments").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      assessments = a || [];
    }
  } catch {}
  return (
    <TrackerClient
      initialAssessments={assessments}
      curriculum={curriculum}
      interests={interests}
    />
  );
}
