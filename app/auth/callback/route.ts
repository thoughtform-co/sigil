import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveAuthRedirectPath } from "@/lib/auth/redirect-target";

/**
 * Supabase magic-link callback.
 * Handles both PKCE (code) and token-hash (OTP) flows.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const destination = new URL(resolveAuthRedirectPath(searchParams.get("next")), origin);

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(destination);
    }

    console.error("[auth/callback] Code exchange failed:", error.message);
  }

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as "magiclink" | "email",
    });

    if (!error) {
      return NextResponse.redirect(destination);
    }

    console.error("[auth/callback] Token verification failed:", error.message);
  }

  console.error(
    "[auth/callback] Auth failed for flow:",
    code ? "pkce" : tokenHash ? "otp" : "unknown",
  );

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
