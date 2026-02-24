import { prisma } from "@/lib/prisma";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/require-admin";
import { json } from "@/lib/api/responses";
import { notFound, badRequest } from "@/lib/api/errors";
import { z } from "zod";

const updateUserSchema = z.object({
  isDisabled: z.boolean().optional(),
  role: z.enum(["admin", "user"]).optional(),
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireAdmin();
  if ("error" in result) return result.error;
  const { id } = await params;

  const user = await prisma.profile.findUnique({
    where: { id },
    include: {
      workspaceProjectMembers: {
        include: { workspaceProject: { select: { id: true, name: true } } },
      },
      _count: { select: { generations: true, projects: true } },
    },
  });

  if (!user) return notFound("User not found");

  const costData = await prisma.generation.aggregate({
    where: { userId: id },
    _sum: { cost: true },
    _count: true,
  });

  return json({
    user,
    stats: {
      totalGenerations: costData._count,
      lifetimeCost: Number(costData._sum.cost ?? 0),
    },
  });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireAdmin();
  if ("error" in result) return result.error;
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

  const profile = await prisma.profile.findUnique({ where: { id } });
  if (!profile) return notFound("User not found");

  if (parsed.data.isDisabled !== undefined) {
    const supabaseAdmin = createAdminClient();
    const { error } = await supabaseAdmin.auth.admin.updateUserById(id, {
      ban_duration: parsed.data.isDisabled ? "876000h" : "none",
    });
    if (error) {
      console.error("Failed to update Supabase auth ban:", error.message);
    }
  }

  const updated = await prisma.profile.update({
    where: { id },
    data: {
      ...(parsed.data.isDisabled !== undefined && { isDisabled: parsed.data.isDisabled }),
      ...(parsed.data.role !== undefined && { role: parsed.data.role }),
    },
  });

  return json({ user: updated });
}
