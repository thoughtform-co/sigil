import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/require-admin";
import { notFound } from "@/lib/api/errors";
import { json } from "@/lib/api/responses";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const result = await requireAdmin();
  if ("error" in result) return result.error;

  const { id } = await context.params;
  const generation = await prisma.generation.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!generation) return notFound("Generation not found");

  await prisma.$transaction([
    prisma.output.deleteMany({ where: { generationId: id } }),
    prisma.generation.update({
      where: { id },
      data: {
        status: "processing",
        errorMessage: null,
        errorCategory: null,
        errorRetryable: null,
        lastHeartbeatAt: null,
      },
    }),
  ]);

  const processUrl = new URL("/api/generate/process", request.url);
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const cookie = request.headers.get("cookie");
  if (cookie) headers.Cookie = cookie;
  void fetch(processUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({ generationId: id }),
    cache: "no-store",
  }).catch(() => {
    // Retry dispatch failures are reflected by stale processing status.
  });

  return json({ retried: true, id }, 202);
}
