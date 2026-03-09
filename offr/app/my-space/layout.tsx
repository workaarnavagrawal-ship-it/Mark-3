import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/my-space/Sidebar";
import { DEMO_PROFILE } from "@/lib/demo";
import type { PersonaV2 } from "@/lib/types";

export default async function MySpaceLayout({ children }: { children: React.ReactNode }) {
  let profileName = DEMO_PROFILE.name;
  let profilePersona: PersonaV2 = DEMO_PROFILE.persona!;

  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("name, persona")
        .eq("user_id", user.id)
        .single();
      if (profile?.persona) {
        profileName = profile.name;
        profilePersona = profile.persona as PersonaV2;
      }
    }
  } catch {
    // No auth configured — use demo defaults
  }

  return (
    <div className="grain-overlay" style={{ display: "flex", minHeight: "100vh", background: "var(--bg)" }}>
      <Sidebar name={profileName} persona={profilePersona} />
      <main style={{ flex: 1, marginLeft: "var(--sidebar-w)", minHeight: "100vh" }}>
        {children}
      </main>
    </div>
  );
}
