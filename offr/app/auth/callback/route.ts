import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);

  // Prefer x-forwarded-host (Vercel sets this to the public domain)
  const host = request.headers.get("x-forwarded-host");
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (host ? `${proto}://${host}` : origin);

  // Supabase sends ?error=... when something goes wrong on its end
  const oauthError =
    searchParams.get("error_description") ?? searchParams.get("error");
  if (oauthError) {
    return NextResponse.redirect(
      new URL(`/auth?error=${encodeURIComponent(oauthError)}`, siteUrl)
    );
  }

  const code = searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(
      new URL("/auth?error=No+authorisation+code+received", siteUrl)
    );
  }

  const cookieStore = cookies();

  // Collect cookies that exchangeCodeForSession wants to write so we can
  // attach them directly to the redirect response (cookies().set() inside
  // setAll is not guaranteed to survive a NextResponse.redirect()).
  const pending: { name: string; value: string; options?: any }[] = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          pending.push(...cookiesToSet);
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

  if (!data.user) {
    return NextResponse.redirect(
      new URL("/auth?error=Sign+in+succeeded+but+no+user+was+returned", siteUrl)
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", data.user.id)
    .single();

  const dest = profile ? "/dashboard" : "/onboarding";
  const response = NextResponse.redirect(new URL(dest, siteUrl));

  // Attach session cookies directly so the browser receives them on the
  // same round-trip as the redirect.
  pending.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options ?? {});
  });

  return response;
}
