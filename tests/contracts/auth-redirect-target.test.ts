import { describe, expect, it } from "vitest";
import {
  buildAuthCallbackUrl,
  resolveAuthRedirectPath,
  sanitizeAuthRedirectPath,
} from "@/lib/auth/redirect-target";

describe("auth redirect target helpers", () => {
  it("accepts safe relative paths", () => {
    expect(sanitizeAuthRedirectPath("/journeys/abc")).toBe("/journeys/abc");
    expect(sanitizeAuthRedirectPath("/admin?tab=users")).toBe("/admin?tab=users");
  });

  it("rejects unsafe redirect inputs", () => {
    expect(sanitizeAuthRedirectPath("https://evil.example")).toBeNull();
    expect(sanitizeAuthRedirectPath("//evil.example")).toBeNull();
    expect(sanitizeAuthRedirectPath("\\\\evil.example")).toBeNull();
    expect(sanitizeAuthRedirectPath("/safe\n/evil")).toBeNull();
  });

  it("falls back to the default redirect when next is unsafe", () => {
    expect(resolveAuthRedirectPath("https://evil.example")).toBe("/projects");
  });

  it("builds callback urls with safe next targets only", () => {
    expect(buildAuthCallbackUrl("https://sigil.test", "/journeys/abc")).toBe(
      "https://sigil.test/auth/complete?next=%2Fjourneys%2Fabc",
    );
    expect(buildAuthCallbackUrl("https://sigil.test", "https://evil.example")).toBe(
      "https://sigil.test/auth/complete",
    );
  });
});
