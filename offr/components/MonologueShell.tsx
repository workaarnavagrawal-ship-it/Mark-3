/**
 * MonologueShell — server component layout wrapper.
 *
 * Usage in a dashboard/layout.tsx (server):
 *   import { MonologueShell } from "@/components/MonologueShell";
 *   export default function Layout({ children }) {
 *     return <MonologueShell>{children}</MonologueShell>;
 *   }
 *
 * Reads the profile from Supabase on the server to hydrate
 * the nav with name, persona, and IB score.
 */
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { MonologueNav } from "@/components/MonologueNav";
import type { PersonaCode } from "@/lib/types";

interface MonologueShellProps {
  children: React.ReactNode;
}

export async function MonologueShell({ children }: MonologueShellProps) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth");

  // Fetch minimal profile data for nav
  const { data: profile } = await supabase
    .from("profiles")
    .select("name, persona, ib_total_points")
    .eq("user_id", user.id)
    .single();

  if (!profile) redirect("/onboarding");

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "var(--bg)",
      }}
    >
      <MonologueNav
        name={profile.name}
        persona={(profile.persona as PersonaCode) ?? null}
        ibTotal={profile.ib_total_points ?? null}
      />
      <main
        style={{
          flex: 1,
          marginLeft: 210,
          minHeight: "100vh",
        }}
      >
        {children}
      </main>
    </div>
  );
}
