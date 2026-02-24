import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? origin;

  // Supabase sends ?error=...&error_description=... when something goes wrong
  // (e.g. redirect URL not whitelisted, user cancelled, etc.)
  const oauthError = searchParams.get("error_description") ?? searchParams.get("error");
  if (oauthError) {
    return NextResponse.redirect(
      new URL(`/auth?error=${encodeURIComponent(oauthError)}`, siteUrl)
    );
  }

  const code = searchParams.get("code");
  if (code) {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {}
          },
        },
      }
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return NextResponse.redirect(
        new URL(`/auth?error=${encodeURIComponent(error.message)}`, siteUrl)
      );
    }

    if (data.user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", data.user.id)
        .single();
      return NextResponse.redirect(
        new URL(profile ? "/dashboard" : "/onboarding", siteUrl)
      );
    }
  }

  return NextResponse.redirect(new URL("/auth?error=Sign+in+failed", siteUrl));
}
