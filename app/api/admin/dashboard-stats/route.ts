import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/require-admin";
import { json } from "@/lib/api/responses";
import { withCacheHeaders } from "@/lib/api/cache-headers";

export type AdminDashboardStatRow = {
  displayName: string;
  imageCount: number;
  videoCount: number;
};

export async function GET() {
  const result = await requireAdmin();
  if ("error" in result) return result.error;

  const outputsWithUser = await prisma.output.findMany({
    where: {
      OR: [
        { fileType: { startsWith: "image" } },
        { fileType: { startsWith: "video" } },
      ],
    },
    select: {
      fileType: true,
      generation: { select: { userId: true } },
    },
  });

  const userCounts = new Map<
    string,
    { imageCount: number; videoCount: number }
  >();
  for (const o of outputsWithUser) {
    const uid = o.generation.userId;
    if (!userCounts.has(uid))
      userCounts.set(uid, { imageCount: 0, videoCount: 0 });
    const c = userCounts.get(uid)!;
    if (o.fileType.startsWith("image")) c.imageCount++;
    else if (o.fileType.startsWith("video")) c.videoCount++;
  }

  const profileIds = Array.from(userCounts.keys());
  const profiles = await prisma.profile.findMany({
    where: { id: { in: profileIds } },
    select: { id: true, displayName: true, username: true },
  });

  const adminStats: AdminDashboardStatRow[] = profiles.map((p) => {
    const c = userCounts.get(p.id) ?? { imageCount: 0, videoCount: 0 };
    return {
      displayName: p.displayName || p.username || p.id.slice(0, 8),
      imageCount: c.imageCount,
      videoCount: c.videoCount,
    };
  });
  adminStats.sort(
    (a, b) =>
      b.imageCount + b.videoCount - (a.imageCount + a.videoCount)
  );

  const response = json({ adminStats });
  return withCacheHeaders(response, "short");
}
