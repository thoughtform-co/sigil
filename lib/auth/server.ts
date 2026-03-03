import { cache } from "react";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export type AuthedUser = {
  id: string;
  email: string | null;
};

const AUTH_BYPASS =
  process.env.NODE_ENV === "development" && process.env.SIGIL_AUTH_BYPASS === "true";
const PUBLIC_DEMO = process.env.SIGIL_PUBLIC_DEMO === "true";
const BYPASS_USER_ID = "dcd1da5c-773c-4029-910c-e360fa415fd0";
const BYPASS_USER_EMAIL = "vince@thoughtform.co";

let bypassEnsured = false;
let demoWarned = false;

/**
 * Deduplicated per server request via React.cache — safe to call multiple
 * times in the same RSC render without extra Supabase / DB round-trips.
 */
export const getAuthedUser = cache(async (): Promise<AuthedUser | null> => {
  if (AUTH_BYPASS || PUBLIC_DEMO) {
    if (PUBLIC_DEMO && !demoWarned) {
      demoWarned = true;
      console.warn("[SIGIL] PUBLIC_DEMO mode active — all visitors treated as demo admin. Disable SIGIL_PUBLIC_DEMO before production use.");
    }
    if (!bypassEnsured) {
      bypassEnsured = true;
      await prisma.profile.upsert({
        where: { id: BYPASS_USER_ID },
        update: {
          role: "admin",
          displayName: "Sigil Local",
        },
        create: {
          id: BYPASS_USER_ID,
          username: "sigil-local",
          displayName: "Sigil Local",
          role: "admin",
        },
      });
    }
    return { id: BYPASS_USER_ID, email: BYPASS_USER_EMAIL };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;
  return { id: user.id, email: user.email ?? null };
});

export async function ensureProfile(user: AuthedUser) {
  await prisma.profile.upsert({
    where: { id: user.id },
    update: {},
    create: {
      id: user.id,
      username: user.email?.split("@")[0] ?? `user-${user.id.slice(0, 8)}`,
      displayName: user.email ?? "Sigil User",
    },
  });
}
