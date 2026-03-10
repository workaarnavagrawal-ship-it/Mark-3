import { createClient } from "@/lib/supabase/server";
import Sidebar from "@/components/monologue/Sidebar";
import { MySpaceConsoleRail } from "@/components/my-space/MySpaceConsoleRail";
import { DEMO_PROFILE } from "@/lib/demo";
import type { PersonaV2 } from "@/lib/types";

export default async function ShellLayout({ children }: { children: React.ReactNode }) {
  let profileName = DEMO_PROFILE.name;
  let profilePersona: PersonaV2 = DEMO_PROFILE.persona!;
  let shortlistCount = 0;
  let assessmentCount = 0;
  let hasPS = false;
  let hasEarlyDeadline = false;

  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("name, persona, ps_q1, ps_statement")
        .eq("user_id", user.id)
        .single();
      if (profile?.persona) {
        profileName = profile.name;
        profilePersona = profile.persona as PersonaV2;
        hasPS = !!(profile.ps_q1 || profile.ps_statement);
      }

      const { count: slCount } = await supabase
        .from("shortlisted_courses")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);
      shortlistCount = slCount ?? 0;

      const { count: aCount } = await supabase
        .from("assessments")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);
      assessmentCount = aCount ?? 0;

      const { data: earlyCheck } = await supabase
        .from("assessments")
        .select("course_name, course_id")
        .eq("user_id", user.id);
      if (earlyCheck) {
        hasEarlyDeadline = earlyCheck.some((a: any) => {
          const prefix = (a.course_id || "").split("-")[0]?.toUpperCase();
          const name = (a.course_name || "").toLowerCase();
          return prefix === "OXF" || prefix === "CAM" ||
            name.includes("medicine") || name.includes("dentistry") || name.includes("veterinary");
        });
      }
    }
  } catch {
    // No auth configured — use demo defaults
  }

  return (
    <div className="grain-overlay" style={{ display: "flex", minHeight: "100vh", background: "var(--bg)" }}>
      <Sidebar name={profileName} persona={profilePersona} />
      <main style={{
        flex: 1,
        marginLeft: "var(--sidebar-w)",
        minHeight: "100vh",
        display: "flex",
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {children}
        </div>
        <MySpaceConsoleRail
          persona={profilePersona}
          shortlistCount={shortlistCount}
          assessmentCount={assessmentCount}
          hasPS={hasPS}
          deadlineWindow={hasEarlyDeadline ? "early" : "main"}
        />
      </main>
    </div>
  );
}
