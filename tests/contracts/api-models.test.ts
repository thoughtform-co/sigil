import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/models/route";

vi.mock("@/lib/auth/server", () => ({
  getAuthedUser: vi.fn(),
}));

import { getAuthedUser } from "@/lib/auth/server";

describe("GET /api/models contract", () => {
  beforeEach(() => {
    vi.mocked(getAuthedUser).mockReset();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getAuthedUser).mockResolvedValue(null);

    const req = new Request("http://localhost/api/models");
    const res = await GET(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data).toHaveProperty("error", "Unauthorized");
  });

  it("returns 200 with models array when authenticated", async () => {
    vi.mocked(getAuthedUser).mockResolvedValue({ id: "user-1", email: "u@t.co" });

    const req = new Request("http://localhost/api/models");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty("models");
    expect(Array.isArray(data.models)).toBe(true);
  });

  it("returns 200 with models filtered by type=image when query param present", async () => {
    vi.mocked(getAuthedUser).mockResolvedValue({ id: "user-1", email: "u@t.co" });

    const req = new Request("http://localhost/api/models?type=image");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty("models");
    expect(Array.isArray(data.models)).toBe(true);
    data.models.forEach((m: { type: string }) => expect(m.type).toBe("image"));
  });
});
