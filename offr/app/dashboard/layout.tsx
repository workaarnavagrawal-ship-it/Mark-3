import { createClient } from "@/lib/supabase/server";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { StickyNotes } from "@/components/dashboard/StickyNotes";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  let name = "Demo";
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from("profiles").select("name").eq("user_id", user.id).single();
      if (profile?.name) name = profile.name;
    }
  } catch {}
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg)" }}>
      <DashboardNav name={name} />
      <main style={{ flex: 1, marginLeft: "210px", minHeight: "100vh" }}>{children}</main>
      <StickyNotes />
    </div>
  );
}
