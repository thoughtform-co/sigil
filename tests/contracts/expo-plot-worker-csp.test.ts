import { describe, expect, it } from "vitest";
import { getPathMatch } from "next/dist/shared/lib/router/utils/path-match";
import nextConfig from "@/next.config";

const WORKER_CSP = "default-src 'none'; script-src 'self'";

/** The Content-Security-Policy Next.js would send for a path: the last matching rule's value wins. */
async function cspFor(pathname: string): Promise<string | undefined> {
  let csp: string | undefined;
  for (const rule of (await nextConfig.headers!()) ?? []) {
    if (!getPathMatch(rule.source)(pathname)) continue;
    for (const h of rule.headers) if (h.key.toLowerCase() === "content-security-policy") csp = h.value;
  }
  return csp;
}

describe("Expo City's plot worker", () => {
  it("is served with a policy that lets the students' code make no request", async () => {
    expect(await cspFor("/expo/assets/plot.worker-C_aPMbgd.js")).toBe(WORKER_CSP);
    expect(await cspFor("/expo/assets/plot.worker-x1.js.map")).toBe(WORKER_CSP);
  });

  it("and nothing else is", async () => {
    for (const path of ["/expo", "/expo/", "/expo/index.html", "/expo/assets/main-RQxep8y_.js", "/expo/assets/iso-IKrwxwlr.js", "/expo/assets/sub/plot.worker-a.js", "/expo/plot.worker-a.js", "/assets/plot.worker-a.js", "/projects", "/api/expo/me"]) {
      expect(await cspFor(path)).not.toBe(WORKER_CSP);
    }
  });
});
