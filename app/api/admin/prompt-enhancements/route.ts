import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/require-admin";

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  systemPrompt: z.string().min(1),
  modelIds: z.array(z.string().min(1)).min(1),
  isActive: z.boolean().optional(),
});

export async function GET() {
  const result = await requireAdmin();
  if ("error" in result) return result.error;

  const prompts = await prisma.promptEnhancementPrompt.findMany({
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json(prompts);
}

export async function POST(request: Request) {
  const result = await requireAdmin();
  if ("error" in result) return result.error;

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const created = await prisma.promptEnhancementPrompt.create({
    data: {
      ...parsed.data,
      createdBy: result.user.id,
      updatedBy: result.user.id,
    },
  });

  return NextResponse.json(created, { status: 201 });
}
