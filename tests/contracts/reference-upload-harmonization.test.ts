import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = join(__dirname, "..", "..");

/**
 * Structural contract: every client-side reference-image upload should go
 * through the shared multipart helper rather than ad-hoc JSON dataUrl POSTs.
 * This catches regressions where a new surface re-introduces the pattern that
 * caused "Failed to fetch" on Vercel due to oversized JSON request bodies.
 */
describe("reference upload harmonization", () => {
  const uploadConsumers = [
    "components/generation/ProjectWorkspace.tsx",
    "components/canvas/nodes/ImageGenNode.tsx",
    "components/canvas/nodes/VideoGenNode.tsx",
    "components/generation/ConvertToVideoModal.tsx",
  ];

  it("no client component sends JSON dataUrl bodies to the upload endpoint", () => {
    const violations: string[] = [];

    for (const relPath of uploadConsumers) {
      const abs = join(REPO_ROOT, relPath);
      const src = readFileSync(abs, "utf8");
      const hasJsonDataUrl =
        src.includes('"Content-Type": "application/json"') &&
        src.includes("dataUrl") &&
        src.includes("/api/upload/reference-image");

      if (hasJsonDataUrl) {
        violations.push(relPath);
      }
    }

    expect(
      violations,
      `Files still using JSON dataUrl upload:\n${violations.join("\n")}`,
    ).toEqual([]);
  });

  it("all upload consumers import from the shared reference-upload module", () => {
    const missing: string[] = [];

    for (const relPath of uploadConsumers) {
      const abs = join(REPO_ROOT, relPath);
      const src = readFileSync(abs, "utf8");
      const importsShared =
        src.includes("@/lib/client/reference-upload") ||
        src.includes("lib/client/reference-upload");

      if (!importsShared) {
        missing.push(relPath);
      }
    }

    expect(
      missing,
      `Files not using shared upload helper:\n${missing.join("\n")}`,
    ).toEqual([]);
  });

  it("the shared helper uses signed direct storage upload instead of server body upload", () => {
    const src = readFileSync(
      join(REPO_ROOT, "lib/client/reference-upload.ts"),
      "utf8",
    );
    expect(src).toContain("/api/upload/reference-image/direct");
    expect(src).toContain("uploadToSignedUrl");
  });

  it("handleUseAsReference replaces refs rather than appending", () => {
    const src = readFileSync(
      join(REPO_ROOT, "components/generation/ProjectWorkspace.tsx"),
      "utf8",
    );
    expect(src).toContain("setReferenceImages([url])");
    expect(src).not.toMatch(
      /handleUseAsReference[\s\S]{0,200}\.\.\.\s*prev/,
    );
  });
});
