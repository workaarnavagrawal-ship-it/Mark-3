import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      `Supabase env vars missing: NEXT_PUBLIC_SUPABASE_URL=${url ? "set" : "MISSING"}, NEXT_PUBLIC_SUPABASE_ANON_KEY=${key ? "set" : "MISSING"}`
    );
  }
  return createBrowserClient(url, key);
}
