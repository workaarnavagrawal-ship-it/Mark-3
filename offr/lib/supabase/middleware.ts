import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  // If Supabase env vars are absent (e.g. local dev without .env.local),
  // skip auth entirely so /api/py/* and public routes still work.
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return supabaseResponse;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Public routes — no auth required
  const isPublic =
    pathname === "/" ||
    pathname === "/auth" ||
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/py") ||
    pathname.startsWith("/api/auth");

  // Redirect unauthenticated users to /auth for protected routes
  if (!user && !isPublic) {
    return NextResponse.redirect(new URL("/auth", request.url));
  }

  // For authenticated users on protected routes (not onboarding itself),
  // check if profile is complete (has persona set = finished onboarding)
  if (user && !isPublic && pathname !== "/onboarding") {
    const { data: profile } = await supabase
      .from("profiles")
      .select("persona")
      .eq("user_id", user.id)
      .single();

    // No profile or no persona = hasn't finished onboarding
    if (!profile || !profile.persona) {
      return NextResponse.redirect(new URL("/onboarding", request.url));
    }
  }

  // If authenticated user visits /auth, redirect to /my-space
  if (user && (pathname === "/auth" || pathname.startsWith("/auth/"))) {
    // Don't redirect the callback route
    if (pathname !== "/auth/callback") {
      return NextResponse.redirect(new URL("/my-space", request.url));
    }
  }

  return supabaseResponse;
}
