import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { LandingNav } from "@/components/LandingNav";
import { LandingClient } from "@/components/LandingClient";

export default async function LandingPage({ searchParams }: { searchParams: { code?: string; token_hash?: string; type?: string } }) {
  if (searchParams.code) redirect(`/auth/callback?code=${searchParams.code}`);
  if (searchParams.token_hash && searchParams.type) redirect(`/auth/callback?token_hash=${searchParams.token_hash}&type=${searchParams.type}`);

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/my-space");

  return (
    <div className="grain-overlay" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--bg)" }}>
      <LandingNav />
      <LandingClient />
    </div>
  );
}
