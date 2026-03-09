import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/my-space/Sidebar";
import type { PersonaV2 } from "@/lib/types";

export default async function MySpaceLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, persona")
    .eq("user_id", user.id)
    .single();

  if (!profile || !profile.persona) redirect("/onboarding");

  return (
    <div className="grain-overlay" style={{ display: "flex", minHeight: "100vh", background: "var(--bg)" }}>
      <Sidebar name={profile.name} persona={profile.persona as PersonaV2} />
      <main style={{ flex: 1, marginLeft: "var(--sidebar-w)", minHeight: "100vh" }}>
        {children}
      </main>
    </div>
  );
}
