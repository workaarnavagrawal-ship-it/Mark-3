import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // Never intercept the auth pages or the OAuth callback — the route handler
  // must run unobstructed so it can verify the OTP token before anything else
  // touches the session. /auth itself must not trigger a session refresh that
  // could redirect away from the sign-in page if cookies are in a bad state.
  if (pathname === "/auth" || pathname.startsWith("/auth/")) {
    return NextResponse.next();
  }
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
