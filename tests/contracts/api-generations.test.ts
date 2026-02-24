import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/generations/route";

vi.mock("@/lib/auth/server", () => ({
  getAuthedUser: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    session: { findFirst: vi.fn() },
    generation: { findMany: vi.fn() },
    workspaceProjectMember: { findMany: vi.fn().mockResolvedValue([]) },
  },
}));

vi.mock("@/lib/auth/project-access", () => ({
  projectAccessFilter: vi.fn().mockResolvedValue({
    OR: [{ ownerId: "user-1" }, { members: { some: { userId: "user-1" } } }],
  }),
}));

import { getAuthedUser } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";

describe("GET /api/generations contract", () => {
  beforeEach(() => {
    vi.mocked(getAuthedUser).mockReset();
    vi.mocked(prisma.session.findFirst).mockReset();
    vi.mocked(prisma.generation.findMany).mockReset();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getAuthedUser).mockResolvedValue(null);

    const req = new Request("http://localhost/api/generations?sessionId=00000000-0000-0000-0000-000000000001");
    const res = await GET(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data).toHaveProperty("error", "Unauthorized");
  });

  it("returns 400 when sessionId is missing", async () => {
    vi.mocked(getAuthedUser).mockResolvedValue({ id: "user-1", email: "u@t.co" });

    const req = new Request("http://localhost/api/generations");
    const res = await GET(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/sessionId/i);
  });

  it("returns 404 when session not found or access denied", async () => {
    vi.mocked(getAuthedUser).mockResolvedValue({ id: "user-1", email: "u@t.co" });
    vi.mocked(prisma.session.findFirst).mockResolvedValue(null);

    const req = new Request("http://localhost/api/generations?sessionId=00000000-0000-0000-0000-000000000001");
    const res = await GET(req);
    expect(res.status).toBe(404);
  });

  it("returns 200 with generations array when session exists", async () => {
    const sessionId = "00000000-0000-0000-0000-000000000001";
    vi.mocked(getAuthedUser).mockResolvedValue({ id: "user-1", email: "u@t.co" });
    vi.mocked(prisma.session.findFirst).mockResolvedValue({ id: sessionId } as never);
    vi.mocked(prisma.generation.findMany).mockResolvedValue([]);

    const req = new Request(`http://localhost/api/generations?sessionId=${sessionId}`);
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty("generations");
    expect(Array.isArray(data.generations)).toBe(true);
  });
});
