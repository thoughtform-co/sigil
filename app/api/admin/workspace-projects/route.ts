import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/require-admin";
import { json } from "@/lib/api/responses";
import { badRequest } from "@/lib/api/errors";

const createSchema = z.object({
  name: z.string().min(1).max(256),
  description: z.string().max(2000).optional(),
  type: z.enum(["learn", "create"]).default("create"),
});

export async function GET() {
  const result = await requireAdmin();
  if ("error" in result) return result.error;

  const workspaceProjects = await prisma.workspaceProject.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      members: {
        include: {
          user: { select: { id: true, displayName: true, username: true, avatarUrl: true, isDisabled: true } },
        },
      },
      _count: { select: { briefings: true } },
    },
  });

  return json({ workspaceProjects });
}

export async function POST(request: Request) {
  const result = await requireAdmin();
  if ("error" in result) return result.error;

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

  const wp = await prisma.workspaceProject.create({
    data: { name: parsed.data.name, description: parsed.data.description, type: parsed.data.type },
    include: { members: true, _count: { select: { briefings: true } } },
  });

  return json({ workspaceProject: wp }, 201);
}
