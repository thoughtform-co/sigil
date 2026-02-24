import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/require-admin";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  systemPrompt: z.string().min(1).optional(),
  modelIds: z.array(z.string().min(1)).min(1).optional(),
  isActive: z.boolean().optional(),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const result = await requireAdmin();
  if ("error" in result) return result.error;

  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await prisma.promptEnhancementPrompt.update({
    where: { id },
    data: {
      ...parsed.data,
      updatedBy: result.user.id,
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, context: RouteContext) {
  const result = await requireAdmin();
  if ("error" in result) return result.error;

  const { id } = await context.params;
  await prisma.promptEnhancementPrompt.delete({ where: { id } });
  return NextResponse.json({ deleted: true, id });
}
