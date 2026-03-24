import { cache } from "react";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Returns a Prisma `where` clause fragment for finding projects visible to a user.
 * Deduplicated per server request via React.cache.
 */
export const projectAccessFilter = cache(async (userId: string): Promise<Prisma.ProjectWhereInput> => {
  const profile = await prisma.profile.findUnique({
    where: { id: userId },
    select: { role: true, lockedWorkspaceProjectId: true },
  });

  const lockedId =
    profile?.role === "admin" ? null : (profile?.lockedWorkspaceProjectId ?? null);

  if (lockedId) {
    return { workspaceProjectId: lockedId };
  }

  const wpMemberships = await prisma.workspaceProjectMember.findMany({
    where: { userId },
    select: { workspaceProjectId: true },
  });
  const wpIds = wpMemberships.map((m) => m.workspaceProjectId);

  const conditions: Prisma.ProjectWhereInput[] = [
    { ownerId: userId },
    { members: { some: { userId } } },
  ];

  if (wpIds.length > 0) {
    conditions.push({ workspaceProjectId: { in: wpIds } });
  }

  return { OR: conditions };
});
