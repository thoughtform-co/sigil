import type { InitialAuthUser } from "@/lib/types/auth";
import { getAuthedUser } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";

/**
 * Loads profile for AuthProvider initial state. Called from root layout only.
 */
export async function getInitialAuthUser(): Promise<InitialAuthUser | null> {
  try {
    const user = await getAuthedUser();
    if (!user) return null;
    const profile = await prisma.profile.findUnique({
      where: { id: user.id },
      select: {
        role: true,
        username: true,
        displayName: true,
        lockedWorkspaceProjectId: true,
      },
    });
    const role = (profile?.role as "admin" | "user") ?? "user";
    return {
      id: user.id,
      email: user.email,
      username: profile?.username ?? null,
      displayName: profile?.displayName ?? null,
      role,
      lockedWorkspaceProjectId:
        role === "admin" ? null : (profile?.lockedWorkspaceProjectId ?? null),
    };
  } catch {
    return null;
  }
}
