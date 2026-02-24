import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/require-admin";
import { json } from "@/lib/api/responses";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, context: RouteContext) {
  const result = await requireAdmin();
  if ("error" in result) return result.error;

  const { id } = await context.params;

  await prisma.allowedEmail.deleteMany({
    where: { id },
  });

  return json({ ok: true });
}
