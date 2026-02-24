import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { StickyNotes } from "@/components/dashboard/StickyNotes";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");
  const { data: profile } = await supabase.from("profiles").select("name").eq("user_id", user.id).single();
  if (!profile) redirect("/onboarding");
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg)" }}>
      <DashboardNav name={profile.name} />
      <main style={{ flex: 1, marginLeft: "210px", minHeight: "100vh" }}>{children}</main>
      <StickyNotes />
    </div>
  );
}
