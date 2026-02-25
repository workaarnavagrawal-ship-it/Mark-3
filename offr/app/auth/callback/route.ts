import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const error = requestUrl.searchParams.get("error");
  const errorDescription = requestUrl.searchParams.get("error_description");

  // Google returned an error (user denied, misconfigured OAuth, etc.)
  if (error) {
    console.error("OAuth error:", error, errorDescription);
    return NextResponse.redirect(
      `${requestUrl.origin}/auth?error=${encodeURIComponent(errorDescription || error)}`
    );
  }

  if (!code) {
    // No code — something went wrong upstream
    return NextResponse.redirect(`${requestUrl.origin}/auth?error=no_code`);
  }

  const cookieStore = cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    console.error("exchangeCodeForSession error:", exchangeError.message);
    return NextResponse.redirect(
      `${requestUrl.origin}/auth?error=${encodeURIComponent(exchangeError.message)}`
    );
  }

  // Session established — figure out where to send them
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${requestUrl.origin}/auth?error=no_user`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle(); // maybeSingle won't throw if row missing

  const destination = profile ? "/dashboard" : "/onboarding";
  return NextResponse.redirect(`${requestUrl.origin}${destination}`);
}