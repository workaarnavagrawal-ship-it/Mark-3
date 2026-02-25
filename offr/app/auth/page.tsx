"use client";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [sent, setSent] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr("");
    setSent(false);

    const trimmed = email.trim();
    if (!trimmed) {
      setErr("Enter an email address.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: {
          emailRedirectTo: `${location.origin}/auth/callback`,
        },
      });

      if (error) {
        setErr(error.message || "Something went wrong sending the link.");
      } else {
        setSent(true);
      }
    } catch {
      setErr("Something went wrong sending the link.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background: "var(--bg)",
      }}
    >
      <div style={{ width: "100%", maxWidth: "360px" }}>
        <a
          href="/"
          className="serif"
          style={{
            display: "block",
            fontSize: "22px",
            fontWeight: 400,
            fontStyle: "italic",
            color: "var(--t)",
            textDecoration: "none",
            marginBottom: "56px",
          }}
        >
          offr
        </a>

        <h1
          className="serif"
          style={{
            fontSize: "38px",
            fontWeight: 400,
            letterSpacing: "-0.025em",
            color: "var(--t)",
            marginBottom: "10px",
          }}
        >
          Sign in
        </h1>
        <p
          style={{
            fontSize: "14px",
            color: "var(--t3)",
            marginBottom: "40px",
            lineHeight: 1.65,
          }}
        >
          Enter your email and we&apos;ll send you a one‑time sign‑in link.
        </p>

        {err && (
          <div
            style={{
              marginBottom: "16px",
              padding: "12px 16px",
              background: "var(--rch-bg)",
              border: "1px solid var(--rch-b)",
              borderRadius: "10px",
            }}
          >
            <p style={{ fontSize: "13px", color: "var(--rch-t)" }}>{err}</p>
          </div>
        )}

        {sent && !err && (
          <div
            style={{
              marginBottom: "16px",
              padding: "12px 16px",
              background: "var(--safe-bg)",
              border: "1px solid var(--safe-b)",
              borderRadius: "10px",
            }}
          >
            <p style={{ fontSize: "13px", color: "var(--safe-t)" }}>
              Check your inbox. Click the link on this device to finish signing
              in.
            </p>
          </div>
        )}

        <form
          onSubmit={onSubmit}
          style={{ display: "flex", flexDirection: "column", gap: "12px" }}
        >
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: "10px",
              border: "1px solid var(--b-strong)",
              background: "var(--s2)",
              color: "var(--t)",
              fontSize: "14px",
            }}
          />

          <button
            type="submit"
            disabled={loading}
            className="btn"
            style={{
              width: "100%",
              background: "var(--s2)",
              border: "1px solid var(--b-strong)",
              color: "var(--t)",
              fontSize: "14px",
              padding: "14px 20px",
              transition: "all 150ms",
              cursor: loading ? "default" : "pointer",
            }}
            onMouseEnter={(e) => {
              if (!loading)
                (e.currentTarget as HTMLElement).style.borderColor =
                  "var(--acc)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor =
                "var(--b-strong)";
            }}
          >
            {loading ? (
              <span
                style={{
                  width: "16px",
                  height: "16px",
                  border: "1.5px solid var(--b-strong)",
                  borderTopColor: "var(--t2)",
                  borderRadius: "50%",
                  display: "inline-block",
                  animation: "spin 0.8s linear infinite",
                }}
              />
            ) : (
              "Send magic link"
            )}
          </button>
        </form>

        <p
          style={{
            marginTop: "20px",
            fontSize: "12px",
            color: "var(--t3)",
            textAlign: "center",
            lineHeight: 1.6,
          }}
        >
          Your data is private and secure. Only you can see your profile.
        </p>
      </div>
    </div>
  );
}
