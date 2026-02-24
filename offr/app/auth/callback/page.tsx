"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function CallbackPage() {
  const router = useRouter();
  useEffect(() => {
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session) {
        subscription.unsubscribe();
        const { data: profile } = await supabase.from("profiles").select("id").eq("user_id", session.user.id).single();
        router.push(profile ? "/dashboard" : "/onboarding");
      }
    });
    // Also try immediately
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        supabase.from("profiles").select("id").eq("user_id", session.user.id).single().then(({ data: profile }) => {
          router.push(profile ? "/dashboard" : "/onboarding");
        });
      }
    });
  }, [router]);

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: "28px", height: "28px", border: "1.5px solid var(--b-strong)", borderTopColor: "var(--t2)", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
        <p style={{ fontSize: "14px", color: "var(--t3)" }}>Signing you in…</p>
      </div>
    </div>
  );
}
