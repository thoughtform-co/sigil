import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/generate/process/route";

vi.mock("@/lib/auth/server", () => ({
  getAuthedUser: vi.fn(),
}));

vi.mock("@/lib/auth/project-access", () => ({
  projectAccessFilter: vi.fn().mockResolvedValue({
    OR: [{ ownerId: "user-1" }, { members: { some: { userId: "user-1" } } }],
  }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    generation: {
      findFirst: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/models/registry", () => ({
  getModel: vi.fn(),
  getModelConfig: vi.fn(),
}));

vi.mock("@/lib/models/routing", () => ({
  routeModel: vi.fn(),
}));

vi.mock("@/lib/observability/generation", () => ({
  observeGeneration: vi.fn(),
}));

vi.mock("@/lib/reference-images", () => ({
  hydrateReferenceParameters: vi.fn(),
  hasEphemeralReferenceUrls: vi.fn().mockReturnValue(false),
}));

vi.mock("@/lib/supabase/storage", () => ({
  uploadProviderOutput: vi.fn(),
  uploadDataUriOutput: vi.fn(),
}));

vi.mock("@/lib/supabase/realtime", () => ({
  broadcastGenerationUpdate: vi.fn(),
}));

vi.mock("@/lib/errors/classification", () => ({
  classifyError: vi.fn(),
  userFacingMessage: vi.fn(),
}));

import { getAuthedUser } from "@/lib/auth/server";
import { routeModel } from "@/lib/models/routing";
import { prisma } from "@/lib/prisma";

describe("POST /api/generate/process locking", () => {
  const generationId = "550e8400-e29b-41d4-a716-446655440001";

  beforeEach(() => {
    vi.mocked(getAuthedUser).mockReset();
    vi.mocked(prisma.generation.findFirst).mockReset();
    vi.mocked(prisma.generation.updateMany).mockReset();
    vi.mocked(routeModel).mockReset();
  });

  it("does not re-process a generation that is already locked", async () => {
    vi.mocked(getAuthedUser).mockResolvedValue({ id: "user-1", email: "u@t.co" });
    vi.mocked(prisma.generation.findFirst).mockResolvedValue({
      id: generationId,
      sessionId: "session-123",
      modelId: "gemini-nano-banana-2",
      prompt: "a cat",
      negativePrompt: null,
      parameters: {},
      status: "processing_locked",
      userId: "user-1",
    } as never);
    vi.mocked(prisma.generation.updateMany).mockResolvedValue({ count: 0 } as never);

    const req = new Request("http://localhost/api/generate/process", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ generationId }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual({ message: "Generation already claimed", id: generationId });
    expect(routeModel).not.toHaveBeenCalled();
  });
});
