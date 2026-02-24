import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/require-admin";
import { json } from "@/lib/api/responses";

export async function GET() {
  const result = await requireAdmin();
  if ("error" in result) return result.error;

  const users = await prisma.profile.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      role: true,
      isDisabled: true,
      createdAt: true,
      workspaceProjectMembers: {
        select: {
          workspaceProject: { select: { id: true, name: true } },
          role: true,
        },
      },
      _count: { select: { generations: true, projects: true } },
    },
  });

  return json({ users });
}
