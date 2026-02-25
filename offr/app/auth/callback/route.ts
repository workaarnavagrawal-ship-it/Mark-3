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
  const incomingError =
    searchParams.get("error_description") ?? searchParams.get("error");
  if (incomingError) {
    return NextResponse.redirect(
      new URL(`/auth?error=${encodeURIComponent(incomingError)}`, siteUrl)
    );
  }

  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const isMagicLink = tokenHash && type;
  const isCodeFlow = code && !isMagicLink;

  if (!isMagicLink && !isCodeFlow) {
    return NextResponse.redirect(
      new URL(
        "/auth?error=No+authorisation+credentials+received",
        siteUrl
      )
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
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          pending.push(...cookiesToSet);
        },
      },
    }
  );

  let userId: string | null = null;
  let topLevelError: string | null = null;

  if (isMagicLink && tokenHash && type) {
    // Email magic link (token_hash + type=email) – verify and create session
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as "email" | "magiclink",
    });
    if (error) {
      topLevelError = error.message;
    } else {
      userId = data.user?.id ?? null;
    }
  } else if (isCodeFlow && code) {
    // OAuth / PKCE-style code flow
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      topLevelError = error.message;
    } else {
      userId = data.user?.id ?? null;
    }
  }

  if (topLevelError) {
    return NextResponse.redirect(
      new URL(`/auth?error=${encodeURIComponent(topLevelError)}`, siteUrl)
    );
  }

  if (!userId) {
    return NextResponse.redirect(
      new URL("/auth?error=Sign+in+succeeded+but+no+user+was+returned", siteUrl)
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", userId)
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
