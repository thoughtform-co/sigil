import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/require-admin";
import { json } from "@/lib/api/responses";
import { badRequest, notFound } from "@/lib/api/errors";

const updateSchema = z.object({
  name: z.string().min(1).max(256).optional(),
  description: z.string().max(2000).optional(),
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireAdmin();
  if ("error" in result) return result.error;
  const { id } = await params;

  const wp = await prisma.workspaceProject.findUnique({
    where: { id },
    include: {
      members: {
        include: {
          user: { select: { id: true, displayName: true, username: true, avatarUrl: true, isDisabled: true } },
        },
      },
      briefings: {
        select: {
          id: true,
          name: true,
          description: true,
          updatedAt: true,
          owner: { select: { id: true, displayName: true, username: true } },
          _count: { select: { sessions: true } },
        },
        orderBy: { updatedAt: "desc" },
      },
    },
  });

  if (!wp) return notFound("Workspace project not found");
  return json({ workspaceProject: wp });
}

export async function PATCH(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireAdmin();
  if ("error" in result) return result.error;
  const { id } = await params;

  const body = await _req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

  const existing = await prisma.workspaceProject.findUnique({ where: { id } });
  if (!existing) return notFound("Workspace project not found");

  const wp = await prisma.workspaceProject.update({
    where: { id },
    data: parsed.data,
  });

  return json({ workspaceProject: wp });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireAdmin();
  if ("error" in result) return result.error;
  const { id } = await params;

  const existing = await prisma.workspaceProject.findUnique({ where: { id } });
  if (!existing) return notFound("Workspace project not found");

  await prisma.workspaceProject.delete({ where: { id } });
  return json({ deleted: true });
}
