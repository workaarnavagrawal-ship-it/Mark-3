"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

export default function CallbackPage() {
  const router = useRouter();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Give Supabase a moment to parse the hash and set the session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("user_id", session.user.id)
          .maybeSingle();
        router.replace(profile ? "/dashboard" : "/onboarding");
      } else {
        // Hash not parsed yet — listen for the event
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && session) {
              subscription.unsubscribe();
              const { data: profile } = await supabase
                .from("profiles")
                .select("id")
                .eq("user_id", session.user.id)
                .maybeSingle();
              router.replace(profile ? "/dashboard" : "/onboarding");
            }
          }
        );
        // Timeout fallback — if nothing fires in 5s, something is wrong
        setTimeout(() => {
          subscription.unsubscribe();
          router.replace("/auth?error=timeout");
        }, 5000);
      }
    });
  }, [router]);

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: "28px", height: "28px", border: "1.5px solid #1F1F22", borderTopColor: "#B9B6AE", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
        <p style={{ fontSize: "14px", color: "#6E6C66" }}>Signing you in…</p>
      </div>
    </div>
  );
}