/**
 * The Sigil MCP server: JSON-RPC 2.0 over streamable HTTP, stateless.
 *
 * Ported from Vesper's headless surface (tensalir/Loop-Vesper, src/lib/headless/mcp-dispatch.ts)
 * and cut down to what Sigil needs: tools only, and the per-person sign-in as the only way in.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { classifyError } from "@/lib/errors/classification";
import { recordHeadlessUsage, verifyMcpRequest, type HeadlessPrincipal } from "./auth";
import { MCP_TOOLS, isToolInputError, type ToolContext } from "./tools";

export const SUPPORTED_PROTOCOL_VERSIONS = ["2025-11-25", "2025-06-18", "2025-03-26"];
const PREFERRED_PROTOCOL_VERSION = "2025-11-25";

export const SERVER_INFO = {
  name: "sigil-headless",
  version: "1.0.0",
  description: "Sigil headless surface: image and video generation with Sigil's own model access.",
};

/** What Claude reads first about Sigil. Clients cut long instructions short, so the essentials lead. */
export const SERVER_INSTRUCTIONS =
  "Draw the images and videos the person asks for with generate_image and generate_video. " +
  "Sigil holds the model access: never ask the person for an API key, and never look for one in a file. " +
  "generate_image answers within about a minute with previews you can read and links to the full-resolution files; a slower draw, and every video, returns a generationId to collect with get_generation_status. " +
  "claude.ai shows the person a picture only when your reply carries it as a markdown image; every image result gives you the exact lines to put in your reply, one per picture. Always put them in. " +
  "Where a folder is connected (Cowork, Claude Code), also download each file into it under the name the work calls for. Sigil cannot write to a disk, you do. " +
  "To draw from a photograph or another picture on disk, call create_upload_urls, send the file to the URL it gives, and pass the `ref` as a reference. " +
  "generate_3d makes a 3D model (GLB) from one to four views, front first; for a character in an A-pose set rig to true for a skeleton, an idle and a wave. It takes minutes: collect it with get_generation_status about once a minute. " +
  "list_models names the models. " +
  "For the AI storytelling course's Expo City: expo_my_area shows the student's own plot, the catalogue and its limits; expo_edit changes it (place, move, remove, set); expo_undo takes back the last change; expo_post posts the week's hand-in (its artifact link) at the drone post, as well as Canvas, never instead; it shows in the live city within seconds. " +
  'Every draw is saved in the person\'s Sigil project "Claude". ' +
  "Images, videos and 3D models made through Claude count against a daily allowance per person; a refusal says how many were used and when the next one frees up, and nothing is paid for.";

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown>;
}

export type JsonRpcResponse =
  | { jsonrpc: "2.0"; id: string | number | null; result: unknown }
  | { jsonrpc: "2.0"; id: string | number | null; error: { code: number; message: string } };

export const ERROR_CODES = {
  parseError: -32700,
  invalidRequest: -32600,
  methodNotFound: -32601,
  invalidParams: -32602,
} as const;

function rpcSuccess(id: string | number | null, result: unknown): JsonRpcResponse {
  return { jsonrpc: "2.0", id, result };
}

export function rpcError(id: string | number | null, code: number, message: string): JsonRpcResponse {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

function isJsonRpcRequest(value: unknown): value is JsonRpcRequest {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return v.jsonrpc === "2.0" && typeof v.method === "string";
}

const InitializeParamsSchema = z.object({ protocolVersion: z.string() });

const CallToolParamsSchema = z.object({
  name: z.string(),
  arguments: z.record(z.string(), z.unknown()).optional().default({}),
});

/** What the dispatcher needs besides the request; the defaults are production, tests inject. */
export interface DispatchDeps {
  tools?: typeof MCP_TOOLS;
  recordUsage?: typeof recordHeadlessUsage;
  waitUntil?: ToolContext["waitUntil"];
  env?: NodeJS.ProcessEnv;
}

export async function dispatch(
  rpc: JsonRpcRequest,
  principal: HeadlessPrincipal,
  deps: DispatchDeps = {},
): Promise<JsonRpcResponse | null> {
  const { id = null, method, params } = rpc;
  const isNotification = id === null || id === undefined;
  const tools = deps.tools ?? MCP_TOOLS;
  const recordUsage = deps.recordUsage ?? recordHeadlessUsage;

  switch (method) {
    case "initialize": {
      const parsed = InitializeParamsSchema.safeParse(params ?? {});
      if (!parsed.success) return rpcError(id, ERROR_CODES.invalidParams, "Invalid initialize params");
      const requested = parsed.data.protocolVersion;
      return rpcSuccess(id, {
        protocolVersion: SUPPORTED_PROTOCOL_VERSIONS.includes(requested) ? requested : PREFERRED_PROTOCOL_VERSION,
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
        instructions: SERVER_INSTRUCTIONS,
      });
    }

    case "notifications/initialized":
    case "initialized":
      return null;

    case "ping":
      return rpcSuccess(id, {});

    case "tools/list":
      return rpcSuccess(id, {
        tools: tools.map((t) => ({
          name: t.name,
          title: t.title,
          description: t.description,
          inputSchema: t.inputSchema,
          annotations: t.annotations,
        })),
      });

    // Not offered, but some clients ask anyway; an empty list is kinder than an error.
    case "prompts/list":
      return rpcSuccess(id, { prompts: [] });
    case "resources/list":
      return rpcSuccess(id, { resources: [] });

    case "tools/call": {
      const parsed = CallToolParamsSchema.safeParse(params ?? {});
      if (!parsed.success) return rpcError(id, ERROR_CODES.invalidParams, "Invalid tools/call params");
      const tool = tools.find((t) => t.name === parsed.data.name);
      if (!tool) return rpcError(id, ERROR_CODES.methodNotFound, `Unknown tool: ${parsed.data.name}`);

      const startedAt = Date.now();
      const base = { credentialId: principal.credentialId, ownerId: principal.ownerId, toolName: tool.name };
      try {
        const { costUsd, modelId, ...wire } = await tool.run(parsed.data.arguments, {
          principal,
          waitUntil: deps.waitUntil ?? (() => undefined),
          env: deps.env ?? process.env,
        });
        // Awaited on purpose: a write still open when the response goes out is frozen with the
        // function, mid-transaction, and holds a database connection until the pooler gives up.
        await recordUsage({
          ...base,
          modelId,
          status: wire.isError ? "refused" : "success",
          durationMs: Date.now() - startedAt,
          costUsd,
        });
        return rpcSuccess(id, wire);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Tool execution failed";
        await recordUsage({
          ...base,
          status: "error",
          errorCategory: isToolInputError(err) ? "invalid_input" : classifyError(err).category,
          durationMs: Date.now() - startedAt,
        });
        // MCP convention: a tool failure is an `isError` result the agent can read, not a JSON-RPC error.
        return rpcSuccess(id, { isError: true, content: [{ type: "text", text: message }] });
      }
    }

    default:
      if (isNotification) return null;
      return rpcError(id, ERROR_CODES.methodNotFound, `Method not found: ${method}`);
  }
}

export async function handleMcpPost(
  request: Request,
  deps: Pick<DispatchDeps, "waitUntil"> = {},
): Promise<NextResponse> {
  const verify = await verifyMcpRequest(request);
  if (!verify.ok) return verify.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(rpcError(null, ERROR_CODES.parseError, "Invalid JSON body"), {
      status: 400,
      headers: verify.headers,
    });
  }

  const isBatch = Array.isArray(body);
  const requests = (isBatch ? body : [body]) as unknown[];
  const responses: JsonRpcResponse[] = [];
  for (const item of requests) {
    if (!isJsonRpcRequest(item)) {
      responses.push(rpcError(null, ERROR_CODES.invalidRequest, "Not a JSON-RPC 2.0 request"));
      continue;
    }
    const out = await dispatch(item, verify.principal, deps);
    if (out) responses.push(out);
  }

  // Notifications only: 202 with no body, as MCP servers should.
  if (!isBatch) {
    if (responses.length === 0) return new NextResponse(null, { status: 202, headers: verify.headers });
    return NextResponse.json(responses[0], { headers: verify.headers });
  }
  return NextResponse.json(responses, { headers: verify.headers });
}
