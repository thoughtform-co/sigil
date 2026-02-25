import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/require-admin";
import { json } from "@/lib/api/responses";

const MIN_AGE_MINUTES = 10;
const HEARTBEAT_STALE_MINUTES = 5;

export async function POST() {
  const result = await requireAdmin();
  if ("error" in result) return result.error;

  const cutoff = new Date(Date.now() - MIN_AGE_MINUTES * 60_000);
  const heartbeatCutoff = new Date(Date.now() - HEARTBEAT_STALE_MINUTES * 60_000);

  const stuck = await prisma.generation.findMany({
    where: {
      status: { in: ["processing", "processing_locked"] },
      createdAt: { lt: cutoff },
      OR: [
        { lastHeartbeatAt: null },
        { lastHeartbeatAt: { lt: heartbeatCutoff } },
      ],
    },
    select: { id: true, modelId: true, createdAt: true, lastHeartbeatAt: true },
  });

  if (stuck.length === 0) {
    return json({ cleaned: 0, ids: [] });
  }

  const ids = stuck.map((g) => g.id);

  await prisma.generation.updateMany({
    where: { id: { in: ids } },
    data: {
      status: "failed",
      errorMessage: "Generation timed out waiting for provider response. Please try again.",
      errorCategory: "timeout",
      errorRetryable: true,
    },
  });

  return json({
    cleaned: ids.length,
    ids,
    details: stuck.map((g) => ({
      id: g.id,
      modelId: g.modelId,
      createdAt: g.createdAt,
      lastHeartbeatAt: g.lastHeartbeatAt,
    })),
  });
}
