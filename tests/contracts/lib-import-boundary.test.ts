import { readFileSync, readdirSync, statSync } from "fs";
import { join, relative } from "path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = join(__dirname, "..", "..");

function collectTsFiles(dir: string, acc: string[] = []): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return acc;
  }
  for (const name of entries) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      collectTsFiles(full, acc);
    } else if (name.endsWith(".ts") && !name.endsWith(".d.ts")) {
      acc.push(full);
    }
  }
  return acc;
}

describe("lib import boundary", () => {
  it("lib/**/*.ts does not import from @/components", () => {
    const libRoot = join(REPO_ROOT, "lib");
    const files = collectTsFiles(libRoot);
    expect(files.length).toBeGreaterThan(0);

    const violations: string[] = [];
    const pattern = /@\/components\//;
    for (const abs of files) {
      const text = readFileSync(abs, "utf8");
      if (pattern.test(text)) {
        violations.push(relative(REPO_ROOT, abs));
      }
    }

    expect(
      violations,
      `lib must not depend on components:\n${violations.join("\n")}`,
    ).toEqual([]);
  });
});
