import { after, NextResponse } from "next/server";
import { handleMcpPost, SERVER_INFO, SUPPORTED_PROTOCOL_VERSIONS } from "@/lib/headless/mcp-dispatch";
import { MCP_TOOLS } from "@/lib/headless/tools";
import { protectedResourceMetadata } from "@/lib/oauth/metadata";

/**
 * POST /api/mcp
 *
 * Streamable HTTP MCP server (JSON-RPC 2.0) for Claude's connector and any client that speaks
 * MCP over HTTP. Public by design as a route (no session cookie, no getAuthedUser): every request
 * is authenticated in `verifyMcpRequest` with a per-person sign-in token (OAuth 2.1,
 * `Authorization: Bearer sgl_oat_...`). A request without one gets a 401 whose
 * `WWW-Authenticate` names the protected-resource document.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: Request) {
  // `after` keeps the function alive for a draw that outlives the response (a slow image, a video).
  return handleMcpPost(request, { waitUntil: (promise) => after(() => promise) });
}

// Capability probe, no auth: some discovery flows check a server is reachable before signing in.
// A client asking for a server-sent event stream is told there is none (405).
export async function GET(request: Request) {
  if ((request.headers.get("accept") || "").includes("text/event-stream")) {
    return new NextResponse(null, { status: 405, headers: { Allow: "POST" } });
  }
  const origin = new URL(request.url).origin;
  return NextResponse.json(
    {
      service: SERVER_INFO.name,
      version: SERVER_INFO.version,
      transport: "streamable-http",
      protocolVersions: SUPPORTED_PROTOCOL_VERSIONS,
      authentication: {
        scheme: "Bearer",
        description: "Add this URL to Claude as a connector and sign in with your Sigil login (OAuth 2.1).",
        oauth: protectedResourceMetadata(origin),
      },
      tools: MCP_TOOLS.map((t) => ({ name: t.name, title: t.title })),
    },
    { headers: { "Cache-Control": "public, max-age=60, s-maxage=60" } },
  );
}
