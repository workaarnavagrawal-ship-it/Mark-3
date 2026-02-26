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

  // Wrap getUser in try/catch — if Supabase is unreachable or returns an
  // unexpected error, we must NOT crash the middleware. A crashed middleware
  // causes Next.js to return an HTML 500 for every request, which then
  // breaks API routes that expect JSON (they get "Unexpected token '<'").
  let user: any = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    // Network or SDK error — treat as unauthenticated and let the request
    // proceed. Public routes will work; protected routes will redirect.
  }

  const pathname = request.nextUrl.pathname;
  const isPublic = ["/", "/auth"].some(p => pathname === p) ||
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/py");

  if (!user && !isPublic) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return supabaseResponse;
}
