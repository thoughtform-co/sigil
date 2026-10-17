/**
 * Expo City's live state: every plot's document, for the hosted game (sigil.thoughtform.co/expo)
 * to poll every two seconds. Public on purpose: the documents hold only what each student chose to
 * show, and changing one needs the MCP sign-in (lib/headless/expo-tools.ts). Cached at the edge for
 * two seconds, so a full room of viewers costs one read of the bucket per region per two seconds.
 */

import { expoStore, stateOf } from "@/lib/headless/expo";

export const dynamic = "force-dynamic";

const HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "If-None-Match",
  "Access-Control-Expose-Headers": "ETag",
};

export async function GET(request: Request): Promise<Response> {
  try {
    const { body, etag } = stateOf(await expoStore().listPlots());
    const headers = { ...HEADERS, ETag: etag, "Cache-Control": "public, max-age=0, s-maxage=2, stale-while-revalidate=8", "Content-Type": "application/json" };
    if (request.headers.get("if-none-match") === etag) return new Response(null, { status: 304, headers });
    return new Response(body, { status: 200, headers });
  } catch (err) {
    console.warn("[expo] state failed", err instanceof Error ? err.message : err);
    return Response.json({ error: "The Expo's state could not be read just now." }, { status: 503, headers: { ...HEADERS, "Cache-Control": "no-store" } });
  }
}

export function OPTIONS(): Response {
  return new Response(null, { status: 204, headers: HEADERS });
}
