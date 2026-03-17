import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/require-admin";
import { notFound } from "@/lib/api/errors";
import { json } from "@/lib/api/responses";
import { getProcessor } from "@/lib/models/processor";

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
        lastHeartbeatAt: new Date(),
      },
    }),
  ]);

  const baseUrl = new URL(request.url).origin;
  void getProcessor().enqueue(id, baseUrl, {
    cookie: request.headers.get("cookie"),
  });

  return json({ retried: true, id }, 202);
}
