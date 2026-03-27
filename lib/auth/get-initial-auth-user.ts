import type { InitialAuthUser } from "@/lib/types/auth";
import { getAuthedUser } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";

function isNextDynamicServerUsageError(error: unknown): boolean {
  if (error === null || typeof error !== "object") return false;
  const digest = (error as { digest?: string }).digest;
  if (digest === "DYNAMIC_SERVER_USAGE") return true;
  const desc = (error as { description?: string }).description;
  if (typeof desc === "string" && desc.includes("Dynamic server usage")) return true;
  return error instanceof Error && error.message.includes("Dynamic server usage");
}

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
  } catch (error) {
    if (!isNextDynamicServerUsageError(error)) {
      console.error("[SIGIL] getInitialAuthUser failed (layout bootstrap):", error);
    }
    return null;
  }
}
