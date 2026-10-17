import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { dispatch, SERVER_INSTRUCTIONS } from "@/lib/headless/mcp-dispatch";
import { extractBearerToken } from "@/lib/headless/auth";
import { MCP_TOOLS, type McpTool } from "@/lib/headless/tools";
import { decideAllowance, dailyLimit } from "@/lib/headless/allowance";

const principal = { credentialId: "cred-1", ownerId: "person-1", ownerRole: "user" };
const rpc = (method: string, params?: Record<string, unknown>, id: number | null = 1) =>
  ({ jsonrpc: "2.0" as const, id, method, params });

function resultOf(response: Awaited<ReturnType<typeof dispatch>>): Record<string, unknown> {
  if (!response || !("result" in response)) throw new Error("expected a result");
  return response.result as Record<string, unknown>;
}

describe("the MCP protocol", () => {
  it("initializes with tools only, and instructions that keep keys out of it", async () => {
    const result = resultOf(await dispatch(rpc("initialize", { protocolVersion: "2025-06-18" }), principal));
    expect(result.protocolVersion).toBe("2025-06-18");
    expect(result.capabilities).toEqual({ tools: { listChanged: false } });
    expect(SERVER_INSTRUCTIONS).toContain("never ask the person for an API key");
    // Clients cut instructions short; the whole text has to fit.
    expect(SERVER_INSTRUCTIONS.length).toBeLessThan(2000);
  });

  it("falls back to its preferred version for one it does not know", async () => {
    const result = resultOf(await dispatch(rpc("initialize", { protocolVersion: "1999-01-01" }), principal));
    expect(result.protocolVersion).toBe("2025-11-25");
  });

  it("lists every tool with a schema and a read-only or destructive hint", async () => {
    const { tools } = resultOf(await dispatch(rpc("tools/list"), principal)) as { tools: Array<Record<string, unknown>> };
    expect(tools.map((t) => t.name)).toEqual([
      "generate_image",
      "generate_video",
      "generate_3d",
      "get_generation_status",
      "create_upload_urls",
      "list_models",
    ]);
    for (const tool of tools) {
      expect(tool.inputSchema).toMatchObject({ type: "object", additionalProperties: false });
      const hints = tool.annotations as Record<string, unknown>;
      expect("readOnlyHint" in hints || "destructiveHint" in hints, String(tool.name)).toBe(true);
    }
  });

  it("no tool takes or mentions a provider key as input", () => {
    for (const tool of MCP_TOOLS) {
      const properties = Object.keys((tool.inputSchema.properties as Record<string, unknown>) ?? {});
      expect(properties.filter((p) => /key|token|secret/i.test(p)), tool.name).toEqual([]);
    }
  });

  it("answers a notification with nothing and an unknown method with an error", async () => {
    expect(await dispatch(rpc("notifications/initialized", undefined, null), principal)).toBeNull();
    const unknown = await dispatch(rpc("nope/nope"), principal);
    expect(unknown && "error" in unknown && unknown.error.code).toBe(-32601);
  });

  it("runs a tool, logs the cost and never sends it", async () => {
    const recordUsage = vi.fn().mockResolvedValue(undefined);
    const tool: McpTool = {
      name: "generate_image",
      title: "t",
      description: "d",
      inputSchema: { type: "object" },
      annotations: {},
      run: vi.fn().mockResolvedValue({ content: [{ type: "text", text: "done" }], costUsd: 0.04, modelId: "m" }),
    };
    const result = resultOf(
      await dispatch(rpc("tools/call", { name: "generate_image", arguments: { prompt: "a" } }), principal, {
        tools: [tool],
        recordUsage,
      }),
    );
    expect(result).toEqual({ content: [{ type: "text", text: "done" }] });
    expect(recordUsage).toHaveBeenCalledWith(
      expect.objectContaining({ toolName: "generate_image", status: "success", costUsd: 0.04, modelId: "m", ownerId: "person-1" }),
    );
  });

  it("turns a thrown tool error into a readable isError result", async () => {
    const recordUsage = vi.fn().mockResolvedValue(undefined);
    const tool: McpTool = {
      name: "generate_image",
      title: "t",
      description: "d",
      inputSchema: { type: "object" },
      annotations: {},
      run: vi.fn().mockRejectedValue(new Error("boom")),
    };
    const result = resultOf(
      await dispatch(rpc("tools/call", { name: "generate_image" }), principal, { tools: [tool], recordUsage }),
    );
    expect(result).toEqual({ isError: true, content: [{ type: "text", text: "boom" }] });
    expect(recordUsage).toHaveBeenCalledWith(expect.objectContaining({ status: "error" }));
  });

  it("refuses a tool it does not have", async () => {
    const response = await dispatch(rpc("tools/call", { name: "read_env" }), principal);
    expect(response && "error" in response && response.error.code).toBe(-32601);
  });
});

describe("the bearer token", () => {
  const token = `sgl_oat_${"a".repeat(43)}`;
  it("accepts only a Sigil sign-in token", () => {
    expect(extractBearerToken(`Bearer ${token}`)).toBe(token);
    expect(extractBearerToken(`bearer ${token}`)).toBe(token);
    expect(extractBearerToken(null)).toBeNull();
    expect(extractBearerToken("Bearer sk-ant-something")).toBeNull();
    expect(extractBearerToken(`Bearer ${token}x`)).toBeNull();
    expect(extractBearerToken(`Basic ${token}`)).toBeNull();
  });
});

describe("the daily allowance", () => {
  const now = new Date("2026-10-13T12:00:00Z");
  const hoursAgo = (h: number) => new Date(now.getTime() - h * 3_600_000);

  it("reads its limits from the environment, with defaults", () => {
    expect(dailyLimit("image", {} as NodeJS.ProcessEnv)).toBe(60);
    expect(dailyLimit("video", {} as NodeJS.ProcessEnv)).toBe(4);
    expect(dailyLimit("image", { MCP_DAILY_IMAGES: "10" } as unknown as NodeJS.ProcessEnv)).toBe(10);
    expect(dailyLimit("image", { MCP_DAILY_IMAGES: "lots" } as unknown as NodeJS.ProcessEnv)).toBe(60);
  });

  it("lets a request through while it fits", () => {
    const decision = decideAllowance({ kind: "image", requested: 4, rows: [{ createdAt: hoursAgo(1), count: 6 }], limit: 10, now });
    expect(decision).toEqual({ ok: true, used: 6, limit: 10 });
  });

  it("refuses the request that would go over, and says when the next one frees up", () => {
    const decision = decideAllowance({
      kind: "image",
      requested: 4,
      rows: [
        { createdAt: hoursAgo(23.5), count: 4 },
        { createdAt: hoursAgo(2), count: 4 },
      ],
      limit: 10,
      now,
    });
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.message).toContain("8 of 10 images");
      expect(decision.message).toContain("Nothing was drawn");
      expect(decision.message).toContain("30 minutes");
    }
  });
});
