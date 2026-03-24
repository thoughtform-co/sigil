import { cache } from "react";
import { prisma } from "@/lib/prisma";

/**
 * Server-side access context for journey confinement (workshop participants).
 * Admins ignore lockedWorkspaceProjectId for navigation and API checks.
 */
export type UserAccessContext = {
  userId: string;
  isAdmin: boolean;
  /** Non-null for workshop-locked users (non-admin only). */
  lockedWorkspaceProjectId: string | null;
};

export const getUserAccessContext = cache(async (userId: string): Promise<UserAccessContext | null> => {
  const profile = await prisma.profile.findUnique({
    where: { id: userId },
    select: { role: true, lockedWorkspaceProjectId: true },
  });
  if (!profile) return null;

  const isAdmin = profile.role === "admin";
  return {
    userId,
    isAdmin,
    lockedWorkspaceProjectId: isAdmin ? null : profile.lockedWorkspaceProjectId,
  };
});

/** True if user is a non-admin with a locked journey. */
export function isWorkshopLockedParticipant(ctx: UserAccessContext): boolean {
  return !ctx.isAdmin && ctx.lockedWorkspaceProjectId != null;
}

/**
 * Returns whether the user may access the given journey id.
 * Admins: always. Locked participants: only their locked journey. Others: must be a member.
 */
export async function canAccessJourney(
  userId: string,
  journeyId: string,
  ctx: UserAccessContext,
): Promise<boolean> {
  if (ctx.isAdmin) return true;
  if (ctx.lockedWorkspaceProjectId != null) {
    return journeyId === ctx.lockedWorkspaceProjectId;
  }
  const membership = await prisma.workspaceProjectMember.findUnique({
    where: {
      workspaceProjectId_userId: { workspaceProjectId: journeyId, userId },
    },
    select: { userId: true },
  });
  return membership != null;
}
