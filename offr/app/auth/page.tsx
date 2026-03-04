"use client";

import { FormEvent, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function AuthForm() {
  const searchParams  = useSearchParams();
  const [email, setEmail]     = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr]         = useState("");
  const [sent, setSent]       = useState(false);

  // Show error forwarded from auth/callback (e.g. expired link)
  useEffect(() => {
    const urlError = searchParams.get("error");
    if (urlError) setErr(decodeURIComponent(urlError));
  }, [searchParams]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr("");
    setSent(false);

    const trimmed = email.trim();
    if (!trimmed) { setErr("Enter an email address."); return; }

    setLoading(true);
    try {
      const res  = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      const text = await res.text();
      let data: Record<string, string> = {};
      try { data = JSON.parse(text); } catch { /* non-JSON */ }

      if (!res.ok) {
        const msg = data?.error || `Server error (${res.status}). Please try again.`;
        setErr(msg.toLowerCase().includes("rate limit")
          ? "You just requested a link. Please wait 60 seconds before requesting another."
          : msg);
      } else {
        setSent(true);
      }
    } catch (ex: unknown) {
      setErr((ex as Error)?.message || "Something went wrong sending the link.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "var(--bg)" }}>
      <div style={{ width: "100%", maxWidth: 360 }}>

        <a href="/" className="serif" style={{ display: "block", fontSize: 22, fontWeight: 400, fontStyle: "italic", color: "var(--t)", textDecoration: "none", marginBottom: 56 }}>
          offr
        </a>

        <h1 className="serif" style={{ fontSize: 38, fontWeight: 400, letterSpacing: "-0.025em", color: "var(--t)", marginBottom: 10 }}>
          Sign in
        </h1>
        <p style={{ fontSize: 14, color: "var(--t3)", marginBottom: 40, lineHeight: 1.65 }}>
          Enter your email and we&apos;ll send you a one‑time sign‑in link.
        </p>

        {err && (
          <div style={{ marginBottom: 16, padding: "12px 16px", background: "var(--rch-bg)", border: "1px solid var(--rch-b)", borderRadius: 10 }}>
            <p style={{ fontSize: 13, color: "var(--rch-t)" }}>{err}</p>
          </div>
        )}

        {sent && !err && (
          <div style={{ marginBottom: 16, padding: "12px 16px", background: "var(--safe-bg)", border: "1px solid var(--safe-b)", borderRadius: 10 }}>
            <p style={{ fontSize: 13, color: "var(--safe-t)" }}>
              Check your inbox. Click the link on this device to finish signing in.
            </p>
          </div>
        )}

        <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input
            type="email"
            className="inp"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            style={{ padding: "12px 14px", borderColor: "var(--b-strong)" }}
          />
          <button
            type="submit"
            disabled={loading}
            className="btn"
            style={{ width: "100%", background: "var(--s2)", border: "1px solid var(--b-strong)", color: "var(--t)", fontSize: 14, padding: "14px 20px", transition: "all 150ms", cursor: loading ? "default" : "pointer" }}
            onMouseEnter={(e) => { if (!loading) (e.currentTarget as HTMLElement).style.borderColor = "var(--acc)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--b-strong)"; }}
          >
            {loading ? (
              <span style={{ width: 16, height: 16, border: "1.5px solid var(--b-strong)", borderTopColor: "var(--t2)", borderRadius: "50%", display: "inline-block", animation: "spin 0.8s linear infinite" }} />
            ) : "Send magic link"}
          </button>
        </form>

        <p style={{ marginTop: 20, fontSize: 12, color: "var(--t3)", textAlign: "center", lineHeight: 1.6 }}>
          Your data is private and secure. Only you can see your profile.
        </p>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense>
      <AuthForm />
    </Suspense>
  );
}
