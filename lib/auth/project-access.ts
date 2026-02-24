import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Returns a Prisma `where` clause fragment for finding projects visible to a user.
 * A user can see a project (briefing) if they:
 * 1. Own it
 * 2. Are a direct project member
 * 3. Are a member of the workspace project it belongs to
 */
export async function projectAccessFilter(userId: string): Promise<Prisma.ProjectWhereInput> {
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
}
