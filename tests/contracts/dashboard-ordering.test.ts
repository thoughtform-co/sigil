import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = join(__dirname, "..", "..");

/**
 * Structural contract: dashboard and journey API must sort routes by recent
 * generation activity and prefer images over videos for the preview thumbnail.
 */
describe("dashboard route ordering and preview", () => {
  it("prefetchDashboard sorts routes by per-route activity", () => {
    const src = readFileSync(
      join(REPO_ROOT, "lib/prefetch/dashboard.ts"),
      "utf8",
    );
    expect(src).toContain("activityByRouteId");
    expect(src).toContain("sortedRoutes");
    expect(src).toContain("bTime - aTime");
  });

  it("prefetchDashboard thumbnail query prefers images over videos", () => {
    const src = readFileSync(
      join(REPO_ROOT, "lib/prefetch/dashboard.ts"),
      "utf8",
    );
    expect(src).toContain("CASE WHEN o.file_type LIKE 'image/%' THEN 0 ELSE 1 END");
  });

  it("journey detail API sorts routes by activity and prefers image thumbnails", () => {
    const src = readFileSync(
      join(REPO_ROOT, "app/api/journeys/[id]/route.ts"),
      "utf8",
    );
    expect(src).toContain("activityByProjectId");
    expect(src).toContain("bTime - aTime");
    expect(src).toContain("CASE WHEN o.file_type LIKE 'image/%' THEN 0 ELSE 1 END");
  });

  it("prefetchDashboard populates per-route generation counts", () => {
    const src = readFileSync(
      join(REPO_ROOT, "lib/prefetch/dashboard.ts"),
      "utf8",
    );
    expect(src).toContain("genCountByRouteId");
    expect(src).toContain("gen_count");
  });
});
