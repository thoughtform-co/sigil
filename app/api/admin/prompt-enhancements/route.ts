import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth/server";

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  systemPrompt: z.string().min(1),
  modelIds: z.array(z.string().min(1)).min(1),
  isActive: z.boolean().optional(),
});

async function requireAdmin() {
  const user = await getAuthedUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { role: true },
  });
  if (profile?.role !== "admin") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { user };
}

export async function GET() {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const prompts = await prisma.promptEnhancementPrompt.findMany({
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json(prompts);
}

export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const created = await prisma.promptEnhancementPrompt.create({
    data: {
      ...parsed.data,
      createdBy: guard.user.id,
      updatedBy: guard.user.id,
    },
  });

  return NextResponse.json(created, { status: 201 });
}
