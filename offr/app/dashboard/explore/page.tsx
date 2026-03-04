import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ExploreClient } from "@/components/dashboard/ExploreClient";
import type { PersonaCode } from "@/lib/types";

export default async function ExplorePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");
  const { data: profile } = await supabase
    .from("profiles")
    .select("interests, interest_tags, curriculum, persona")
    .eq("user_id", user.id)
    .single();
  return (
    <ExploreClient
      interests={profile?.interests || []}
      interestTags={profile?.interest_tags || []}
      curriculum={profile?.curriculum ?? "IB"}
      persona={(profile?.persona as PersonaCode) || "EXPLORER"}
    />
  );
}
