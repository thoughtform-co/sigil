import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Supabase magic-link callback.
 * Handles both PKCE (code) and token-hash (OTP) flows.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}/projects`);
    }

    console.error("[auth/callback] Code exchange failed:", error.message);
  }

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as "magiclink" | "email",
    });

    if (!error) {
      return NextResponse.redirect(`${origin}/projects`);
    }

    console.error("[auth/callback] Token verification failed:", error.message);
  }

  console.error(
    "[auth/callback] Auth failed. Params:",
    Object.fromEntries(searchParams.entries()),
  );

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
