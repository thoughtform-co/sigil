import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export type AuthedUser = {
  id: string;
  email: string | null;
};

export async function getAuthedUser(): Promise<AuthedUser | null> {
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
