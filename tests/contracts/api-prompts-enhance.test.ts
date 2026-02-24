import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/prompts/enhance/route";

vi.mock("@/lib/auth/server", () => ({
  getAuthedUser: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    promptEnhancementPrompt: { findFirst: vi.fn() },
  },
}));

import { getAuthedUser } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";

describe("POST /api/prompts/enhance contract", () => {
  beforeEach(() => {
    vi.mocked(getAuthedUser).mockReset();
    vi.mocked(prisma.promptEnhancementPrompt.findFirst).mockResolvedValue(null);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getAuthedUser).mockResolvedValue(null);

    const req = new Request("http://localhost/api/prompts/enhance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "a cat", modelId: "seedream-4" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data).toHaveProperty("error", "Unauthorized");
  });

  it("returns 400 when body is invalid", async () => {
    vi.mocked(getAuthedUser).mockResolvedValue({ id: "user-1", email: "u@t.co" });

    const req = new Request("http://localhost/api/prompts/enhance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ modelId: "seedream-4" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 200 with originalPrompt and enhancedPrompt when valid", async () => {
    vi.mocked(getAuthedUser).mockResolvedValue({ id: "user-1", email: "u@t.co" });

    const req = new Request("http://localhost/api/prompts/enhance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "a cat", modelId: "seedream-4" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty("originalPrompt");
    expect(data).toHaveProperty("enhancedPrompt");
  });
});
