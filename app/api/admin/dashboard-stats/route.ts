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
  const t0 = performance.now();
  const result = await requireAdmin();
  if ("error" in result) return result.error;

  const rows = await prisma.$queryRaw<
    { user_id: string; file_type_prefix: string; count: bigint }[]
  >`
    SELECT g.user_id,
           CASE WHEN o.file_type LIKE 'image%' THEN 'image' ELSE 'video' END AS file_type_prefix,
           COUNT(*)::bigint AS count
    FROM outputs o
    INNER JOIN generations g ON g.id = o.generation_id
    WHERE o.file_type LIKE 'image%' OR o.file_type LIKE 'video%'
    GROUP BY g.user_id, file_type_prefix
  `;

  const userCounts = new Map<string, { imageCount: number; videoCount: number }>();
  for (const row of rows) {
    if (!userCounts.has(row.user_id))
      userCounts.set(row.user_id, { imageCount: 0, videoCount: 0 });
    const c = userCounts.get(row.user_id)!;
    if (row.file_type_prefix === "image") c.imageCount = Number(row.count);
    else c.videoCount = Number(row.count);
  }

  const profileIds = Array.from(userCounts.keys());
  const profiles = profileIds.length > 0
    ? await prisma.profile.findMany({
        where: { id: { in: profileIds } },
        select: { id: true, displayName: true, username: true },
      })
    : [];

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
      b.imageCount + b.videoCount - (a.imageCount + a.videoCount),
  );

  const response = json({ adminStats });
  response.headers.set("Server-Timing", `total;dur=${Math.round(performance.now() - t0)}`);
  return withCacheHeaders(response, "short");
}
