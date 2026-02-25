import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/require-admin";
import { json } from "@/lib/api/responses";

export async function GET() {
  const result = await requireAdmin();
  if ("error" in result) return result.error;

  const generations = await prisma.generation.findMany({
    where: { status: { in: ["failed", "processing", "processing_locked"] } },
    select: {
      id: true,
      modelId: true,
      prompt: true,
      status: true,
      createdAt: true,
      errorMessage: true,
      errorCategory: true,
      errorRetryable: true,
      lastHeartbeatAt: true,
      session: {
        select: {
          id: true,
          name: true,
          project: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      user: {
        select: {
          id: true,
          username: true,
          displayName: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return json({ generations });
}
