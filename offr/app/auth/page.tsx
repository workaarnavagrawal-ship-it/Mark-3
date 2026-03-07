"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [sent, setSent] = useState(false);
  const searchParams = useSearchParams();
  const urlError = searchParams.get("error");

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
      const res = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = await res.json();

      if (!res.ok) {
        const msg = data?.error || "Something went wrong sending the link.";
        if (msg.toLowerCase().includes("rate limit")) {
          setErr("You just requested a link. Please wait 60 seconds before trying again.");
        } else {
          setErr(msg);
        }
      } else {
        setSent(true);
      }
    } catch (e: any) {
      setErr(e?.message || "Something went wrong sending the link.");
    } finally {
      setLoading(false);
    }
  }

  const displayError = err || urlError;

  return (
    <div className="grain-overlay min-h-screen flex items-center justify-center p-6 bg-[var(--bg)]">
      <div className="w-full max-w-[400px]">
        {/* Logo */}
        <Link href="/" className="no-underline block mb-14">
          <span className="serif text-2xl font-normal italic text-[var(--t)]">
            offr
          </span>
        </Link>

        {/* Hardware Panel */}
        <div
          className="rounded-[20px] border border-[var(--b-panel)] bg-[var(--s1)] p-8"
          style={{
            boxShadow: `
              inset 0 1px 0 rgba(255,255,255,0.04),
              inset 0 -1px 0 rgba(0,0,0,0.3),
              0 4px 24px rgba(0,0,0,0.5), 0 1px 2px rgba(0,0,0,0.3)
            `,
          }}
        >
          {/* Header rail */}
          <div className="mb-6">
            <span className="font-mono text-[9px] font-medium uppercase tracking-[0.14em] text-[var(--t3)]">
              Authentication
            </span>
          </div>

          <h1 className="serif text-[2rem] font-normal tracking-tight text-[var(--t)] mb-2">
            Sign in
          </h1>
          <p className="text-sm text-[var(--t3)] mb-8 leading-relaxed">
            Enter your email and we&apos;ll send a one&#8209;time sign&#8209;in link.
          </p>

          {/* Error */}
          {displayError && !sent && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-[var(--rch-bg)] border border-[var(--rch-b)]">
              <p className="font-mono text-[11px] text-[var(--rch-t)]">
                {displayError}
              </p>
            </div>
          )}

          {/* Success */}
          {sent && !err && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-[var(--safe-bg)] border border-[var(--safe-b)]">
              <p className="font-mono text-[11px] text-[var(--safe-t)]">
                Check your inbox. Click the link on this device to finish signing in.
              </p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={onSubmit} className="flex flex-col gap-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              className="inp"
              autoFocus
            />

            <button
              type="submit"
              disabled={loading}
              className="
                w-full py-4 px-6
                rounded-xl
                bg-[var(--acc)] text-[var(--t-inv)]
                font-mono text-xs font-bold uppercase tracking-[0.14em]
                transition-all duration-150
                hover:bg-[var(--acc-h)] hover:shadow-glow
                active:translate-y-[1px]
                disabled:opacity-40 disabled:cursor-not-allowed
              "
              style={{
                boxShadow: loading
                  ? "none"
                  : "0 2px 12px rgba(0,229,199,0.15), inset 0 1px 0 rgba(255,255,255,0.2)",
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-[var(--t-inv)] border-t-transparent rounded-full animate-spin inline-block" />
                  <span>Sending</span>
                </span>
              ) : (
                "Send Magic Link"
              )}
            </button>
          </form>

          <p className="mt-6 text-center font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--t3)] leading-relaxed">
            Your data is private and secure. Only you can see your profile.
          </p>
        </div>
      </div>
    </div>
  );
}
