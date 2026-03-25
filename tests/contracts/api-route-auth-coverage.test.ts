import { readFileSync, readdirSync, statSync } from "fs";
import { join, relative } from "path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = join(__dirname, "..", "..");

function collectRouteFiles(dir: string, acc: string[] = []): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return acc;
  }
  for (const name of entries) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      collectRouteFiles(full, acc);
    } else if (name === "route.ts") {
      acc.push(full);
    }
  }
  return acc;
}

/** Intentionally public handlers (middleware does not gate `/api/*`). */
const PUBLIC_ROUTE_REL = "app/api/auth/check-email/route.ts";

describe("API route auth coverage", () => {
  it("every non-allowlisted app/api route calls getAuthedUser or requireAdmin", () => {
    const apiRoot = join(REPO_ROOT, "app", "api");
    const routes = collectRouteFiles(apiRoot);
    expect(routes.length).toBeGreaterThan(0);

    const violations: string[] = [];
    for (const abs of routes) {
      const rel = relative(REPO_ROOT, abs).replace(/\\/g, "/");
      if (rel === PUBLIC_ROUTE_REL) continue;

      const text = readFileSync(abs, "utf8");
      const hasAuth =
        text.includes("getAuthedUser") || text.includes("requireAdmin");
      if (!hasAuth) {
        violations.push(relative(REPO_ROOT, abs));
      }
    }

    expect(violations, `Missing auth in:\n${violations.join("\n")}`).toEqual([]);
  });
});
