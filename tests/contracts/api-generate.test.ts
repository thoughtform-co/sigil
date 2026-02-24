import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/generate/route";

vi.mock("@/lib/auth/server", () => ({
  getAuthedUser: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    session: { findFirst: vi.fn() },
    generation: { create: vi.fn() },
  },
}));

vi.mock("@/lib/models/registry", () => ({
  getModelConfig: vi.fn(),
  getModel: vi.fn(),
  getAllModels: vi.fn(),
  getModelsByType: vi.fn(),
}));

vi.mock("@/lib/supabase/realtime", () => ({
  broadcastGenerationUpdate: vi.fn(),
}));

vi.mock("@/lib/auth/project-access", () => ({
  projectAccessFilter: vi.fn().mockResolvedValue({
    OR: [{ ownerId: "user-1" }, { members: { some: { userId: "user-1" } } }],
  }),
}));

vi.mock("@/lib/api/rate-limit", () => ({
  checkRateLimit: vi.fn().mockReturnValue(null),
}));

vi.mock("@/lib/models/processor", () => ({
  getProcessor: vi.fn().mockReturnValue({ enqueue: vi.fn() }),
}));

import { getAuthedUser } from "@/lib/auth/server";
import { getModelConfig } from "@/lib/models/registry";
import { prisma } from "@/lib/prisma";

describe("POST /api/generate contract", () => {
  beforeEach(() => {
    vi.mocked(getAuthedUser).mockReset();
    vi.mocked(getModelConfig).mockReset();
    vi.mocked(prisma.session.findFirst).mockReset();
    vi.mocked(prisma.generation.create).mockReset();
  });

  const validSessionId = "550e8400-e29b-41d4-a716-446655440000";

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getAuthedUser).mockResolvedValue(null);

    const req = new Request("http://localhost/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: validSessionId,
        modelId: "seedream-4",
        prompt: "a cat",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data).toHaveProperty("error", "Unauthorized");
  });

  it("returns 400 when body is invalid (missing required fields)", async () => {
    vi.mocked(getAuthedUser).mockResolvedValue({ id: "user-1", email: "u@t.co" });

    const req = new Request("http://localhost/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "a cat" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data).toHaveProperty("error");
  });

  it("returns 400 when sessionId is not a UUID", async () => {
    vi.mocked(getAuthedUser).mockResolvedValue({ id: "user-1", email: "u@t.co" });

    const req = new Request("http://localhost/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: "not-a-uuid",
        modelId: "seedream-4",
        prompt: "a cat",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 404 when session not found or access denied", async () => {
    vi.mocked(getAuthedUser).mockResolvedValue({ id: "user-1", email: "u@t.co" });
    vi.mocked(prisma.session.findFirst).mockResolvedValue(null);
    vi.mocked(getModelConfig).mockReturnValue({ type: "image" } as never);

    const req = new Request("http://localhost/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: validSessionId,
        modelId: "seedream-4",
        prompt: "a cat",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toMatch(/session|access/i);
  });

  it("returns 202 and generation payload when authenticated with valid session and model", async () => {
    vi.mocked(getAuthedUser).mockResolvedValue({ id: "user-1", email: "u@t.co" });
    vi.mocked(prisma.session.findFirst).mockResolvedValue({ id: validSessionId, type: "image" } as never);
    vi.mocked(getModelConfig).mockReturnValue({ type: "image" } as never);
    vi.mocked(prisma.generation.create).mockResolvedValue({
      id: "gen-123",
      status: "processing",
      modelId: "seedream-4",
      createdAt: new Date(),
    } as never);

    const req = new Request("http://localhost/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: validSessionId,
        modelId: "seedream-4",
        prompt: "a cat",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(202);
    const data = await res.json();
    expect(data).toHaveProperty("generation");
    expect(data.generation).toHaveProperty("id");
    expect(data.generation).toHaveProperty("status", "processing");
  });
});
