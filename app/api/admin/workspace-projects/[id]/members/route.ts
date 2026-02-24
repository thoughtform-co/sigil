import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/require-admin";
import { json } from "@/lib/api/responses";
import { badRequest, notFound, conflict } from "@/lib/api/errors";

const addMemberSchema = z.object({
  userId: z.string().uuid(),
  role: z.string().max(64).default("member"),
});

const removeMemberSchema = z.object({
  userId: z.string().uuid(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireAdmin();
  if ("error" in result) return result.error;
  const { id } = await params;

  const wp = await prisma.workspaceProject.findUnique({ where: { id } });
  if (!wp) return notFound("Workspace project not found");

  const body = await req.json().catch(() => null);
  const parsed = addMemberSchema.safeParse(body);
  if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

  const existing = await prisma.workspaceProjectMember.findUnique({
    where: { workspaceProjectId_userId: { workspaceProjectId: id, userId: parsed.data.userId } },
  });
  if (existing) return conflict("User is already a member of this workspace project");

  const member = await prisma.workspaceProjectMember.create({
    data: { workspaceProjectId: id, userId: parsed.data.userId, role: parsed.data.role },
    include: {
      user: { select: { id: true, displayName: true, username: true, avatarUrl: true } },
    },
  });

  return json({ member }, 201);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireAdmin();
  if ("error" in result) return result.error;
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = removeMemberSchema.safeParse(body);
  if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

  const existing = await prisma.workspaceProjectMember.findUnique({
    where: { workspaceProjectId_userId: { workspaceProjectId: id, userId: parsed.data.userId } },
  });
  if (!existing) return notFound("Membership not found");

  await prisma.workspaceProjectMember.delete({
    where: { workspaceProjectId_userId: { workspaceProjectId: id, userId: parsed.data.userId } },
  });

  return json({ removed: true });
}
