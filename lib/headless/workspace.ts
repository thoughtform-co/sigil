/**
 * Where work made through Claude is kept: the person's own project "Claude", with one image
 * session and one video session, so every draw also shows up in the Sigil web app.
 */

import { prisma } from "@/lib/prisma";

export const CLAUDE_PROJECT_NAME = "Claude";
const SESSION_NAMES = { image: "Claude · images", video: "Claude · video" } as const;

export async function ensureClaudeSession(userId: string, type: "image" | "video"): Promise<string> {
  const profile = await prisma.profile.findUnique({
    where: { id: userId },
    select: { role: true, lockedWorkspaceProjectId: true },
  });
  // A workshop participant sees only their journey, so their Claude project lives inside it.
  const workspaceProjectId = profile?.role === "admin" ? null : (profile?.lockedWorkspaceProjectId ?? null);

  let project = await prisma.project.findFirst({
    where: { ownerId: userId, name: CLAUDE_PROJECT_NAME, workspaceProjectId },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (!project) {
    project = await prisma.project.create({
      data: {
        ownerId: userId,
        name: CLAUDE_PROJECT_NAME,
        description: "Everything you made through Claude.",
        isShared: false,
        workspaceProjectId,
      },
      select: { id: true },
    });
  }

  const existing = await prisma.session.findFirst({
    where: { projectId: project.id, type, name: SESSION_NAMES[type] },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (existing) return existing.id;
  const created = await prisma.session.create({
    data: { projectId: project.id, type, name: SESSION_NAMES[type], isPrivate: true },
    select: { id: true },
  });
  return created.id;
}
