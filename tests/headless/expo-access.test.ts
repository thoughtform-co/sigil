import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/server", () => ({ getAuthedUser: vi.fn(async () => ({ id: "cookie-user", email: "c@student.test" })) }));
const tokens = vi.hoisted(() => ({ rows: new Map<string, unknown>() }));
vi.mock("@/lib/oauth/store-prisma", () => ({ findAccessToken: vi.fn(async (hash: string) => tokens.rows.get(hash) ?? null) }));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { getAuthedUser } from "@/lib/auth/server";
import { hashToken } from "@/lib/oauth/tokens";
import { expoCors, expoPreflight, getAuthedUserOrToken, withExpoCors } from "@/lib/headless/expo-access";

const TOKEN = `sgl_oat_${"a".repeat(43)}`;
const RESOURCE = "https://sigil.test/api/mcp";
const row = (over: Record<string, unknown> = {}) => ({
  token: { kind: "access", revokedAt: null, expiresAt: new Date(Date.now() + 3600_000), resource: RESOURCE, ...over },
  credential: { revokedAt: null, kind: "oauth" },
  owner: { id: "token-user", role: "user", isDisabled: false, mcpAccess: true },
});
const req = (headers: Record<string, string> = {}) => new Request("https://sigil.test/api/expo/me", { headers });

beforeEach(() => {
  vi.stubEnv("MCP_OAUTH_SECRET", "x".repeat(40));
  tokens.rows.clear();
});
afterEach(() => vi.unstubAllEnvs());

describe("CORS for the game from a student's own clone", () => {
  it("echoes a loopback origin only, never with credentials", () => {
    for (const origin of ["http://localhost:5173", "http://127.0.0.1:5180", "http://[::1]:5173", "http://localhost"]) {
      const h = expoCors(req({ origin }));
      expect(h["Access-Control-Allow-Origin"]).toBe(origin);
      expect(h["Access-Control-Allow-Credentials"]).toBeUndefined();
      expect(h["Access-Control-Allow-Headers"]).toMatch(/Authorization/);
    }
    for (const origin of ["https://evil.test", "http://localhost.evil.test", "https://localhost:5173", "http://192.168.1.4:5173", "null"]) {
      expect(expoCors(req({ origin }))["Access-Control-Allow-Origin"]).toBeUndefined();
    }
  });
  it("answers a preflight and stamps the handler's answer", async () => {
    const pre = expoPreflight(req({ origin: "http://localhost:5173" }));
    expect(pre.status).toBe(204);
    expect(pre.headers.get("access-control-allow-methods")).toMatch(/POST/);
    const res = await withExpoCors(async () => Response.json({ ok: true }))(req({ origin: "http://localhost:5173" }));
    expect(res.headers.get("access-control-allow-origin")).toBe("http://localhost:5173");
    expect(res.headers.get("vary")).toBe("Origin");
  });
});

describe("getAuthedUserOrToken", () => {
  it("is the session without a token", async () => {
    expect(await getAuthedUserOrToken(req())).toEqual({ id: "cookie-user", email: "c@student.test" });
  });
  it("is the token's owner with a good token, and never falls back to the cookie with a bad one", async () => {
    tokens.rows.set(hashToken(TOKEN), row());
    expect(await getAuthedUserOrToken(req({ authorization: `Bearer ${TOKEN}` }))).toEqual({ id: "token-user", email: null });
    vi.mocked(getAuthedUser).mockClear();
    expect(await getAuthedUserOrToken(req({ authorization: "Bearer not-a-token" }))).toBeNull();
    expect(await getAuthedUserOrToken(req({ authorization: `Bearer sgl_oat_${"b".repeat(43)}` }))).toBeNull();
    expect(getAuthedUser).not.toHaveBeenCalled();
  });
  it("refuses an expired, revoked or foreign token, a disabled account and one whose Claude access is off", async () => {
    const cases = [
      row({ expiresAt: new Date(Date.now() - 1000) }),
      row({ revokedAt: new Date() }),
      row({ resource: "https://elsewhere.test/api/mcp" }),
      { ...row(), owner: { id: "token-user", role: "user", isDisabled: true, mcpAccess: true } },
      { ...row(), owner: { id: "token-user", role: "user", isDisabled: false, mcpAccess: false } },
    ];
    for (const c of cases) {
      tokens.rows.set(hashToken(TOKEN), c);
      expect(await getAuthedUserOrToken(req({ authorization: `Bearer ${TOKEN}` }))).toBeNull();
    }
  });
  it("refuses every token while the sign-in is switched off", async () => {
    vi.stubEnv("MCP_OAUTH_SECRET", "");
    tokens.rows.set(hashToken(TOKEN), row());
    expect(await getAuthedUserOrToken(req({ authorization: `Bearer ${TOKEN}` }))).toBeNull();
  });
});
