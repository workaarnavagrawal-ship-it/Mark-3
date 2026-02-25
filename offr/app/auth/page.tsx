"use client";
import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function AuthInner() {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const searchParams = useSearchParams();
  const callbackError = searchParams.get("error");

  async function go() {
    setErr(""); setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) { setErr(error.message); setLoading(false); }
  }

  const displayError = err || (callbackError ? decodeURIComponent(callbackError) : "");

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", background: "var(--bg)" }}>
      <div style={{ width: "100%", maxWidth: "360px" }}>
        <a href="/" className="serif" style={{ display: "block", fontSize: "22px", fontWeight: 400, fontStyle: "italic", color: "var(--t)", textDecoration: "none", marginBottom: "56px" }}>offr</a>

        <h1 className="serif" style={{ fontSize: "38px", fontWeight: 400, letterSpacing: "-0.025em", color: "var(--t)", marginBottom: "10px" }}>Sign in</h1>
        <p style={{ fontSize: "14px", color: "var(--t3)", marginBottom: "40px", lineHeight: 1.65 }}>
          Continue with Google to access your profile, predictions, and tracker.
        </p>

        {displayError && (
          <div style={{ marginBottom: "20px", padding: "12px 16px", background: "var(--rch-bg)", border: "1px solid var(--rch-b)", borderRadius: "10px" }}>
            <p style={{ fontSize: "12px", color: "var(--t3)", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Sign-in error</p>
            <p style={{ fontSize: "13px", color: "var(--rch-t)", lineHeight: 1.5 }}>{displayError}</p>
          </div>
        )}

        <button
          onClick={go}
          disabled={loading}
          style={{
            width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "12px",
            padding: "14px 20px", background: "var(--s2)", border: "1px solid var(--b-strong)",
            borderRadius: "var(--ri)", color: "var(--t)", fontSize: "14px", fontWeight: 500,
            cursor: loading ? "not-allowed" : "pointer", transition: "all 150ms",
            fontFamily: "var(--font-dm, var(--sans))", opacity: loading ? 0.6 : 1,
          }}
          onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLElement).style.borderColor = "var(--acc)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--b-strong)"; }}
        >
          {loading ? (
            <span style={{ width: "16px", height: "16px", border: "1.5px solid var(--b-strong)", borderTopColor: "var(--t2)", borderRadius: "50%", display: "inline-block", animation: "spin 0.8s linear infinite" }} />
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          )}
          {loading ? "Redirecting to Google…" : "Continue with Google"}
        </button>

        <p style={{ marginTop: "20px", fontSize: "12px", color: "var(--t3)", textAlign: "center", lineHeight: 1.6 }}>
          Your data is private. Only you can see your profile.
        </p>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense>
      <AuthInner />
    </Suspense>
  );
}