import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export type AuthedUser = {
  id: string;
  email: string | null;
};

const AUTH_BYPASS =
  process.env.NODE_ENV === "development" && process.env.SIGIL_AUTH_BYPASS === "true";
const BYPASS_USER_ID = "dcd1da5c-773c-4029-910c-e360fa415fd0";
const BYPASS_USER_EMAIL = "vince@thoughtform.co";

export async function getAuthedUser(): Promise<AuthedUser | null> {
  if (AUTH_BYPASS) {
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
    return { id: BYPASS_USER_ID, email: BYPASS_USER_EMAIL };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;
  return { id: user.id, email: user.email ?? null };
}

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
