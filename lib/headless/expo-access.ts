/**
 * Who is calling Expo City's routes (2026-10-22): the student's Sigil session cookie when the game runs on
 * Sigil itself (/expo), or, when it runs from their own clone at localhost, the one-hour access token of
 * Sigil's own OAuth sign-in (lib/oauth), the same one Claude Code gets. The game at localhost signs in as a
 * public client with PKCE and a loopback redirect (http://localhost:<port>/oauth/callback, which
 * lib/oauth/redirects.ts already allows), and sends the token as `Authorization: Bearer`. The person signs in
 * on Sigil's own page, so Supabase Auth needs no localhost redirect, and no cookie crosses sites: the session
 * cookies keep their SameSite and the routes read cookies only for same-origin calls.
 *
 * CORS is answered for loopback origins only (a student's own machine), never with credentials. A token is
 * held to what an MCP call is held to (lib/oauth/tokens.ts checkAccess): not expired or revoked, issued for
 * this server, the account not disabled and its Claude access on. It does not count against the MCP
 * connection's own per-minute limit (the creator reads its draws every few seconds); the routes keep theirs.
 */

import { getAuthedUser, type AuthedUser } from "@/lib/auth/server";
import { oauthConfig } from "@/lib/oauth/config";
import { acceptedResources } from "@/lib/oauth/metadata";
import { findAccessToken } from "@/lib/oauth/store-prisma";
import { checkAccess, hashToken } from "@/lib/oauth/tokens";
import { extractBearerToken } from "./auth";

/** A student's own machine: the game from their clone (`npm run dev`, `npm run plot`). */
export const LOOPBACK_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d{1,5})?$/;

/** The CORS headers for this request: the loopback origin echoed, anything else left without. */
export function expoCors(request: Request): Record<string, string> {
  const origin = request.headers.get("origin");
  if (!origin || !LOOPBACK_ORIGIN.test(origin)) return { Vary: "Origin" };
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Max-Age": "600",
    Vary: "Origin",
  };
}

/** The preflight of an expo route. */
export function expoPreflight(request: Request): Response {
  return new Response(null, { status: 204, headers: expoCors(request) });
}

/** An expo route's handler with its CORS headers set on whatever it answers. */
export function withExpoCors<A extends unknown[]>(handler: (request: Request, ...rest: A) => Promise<Response>) {
  return async (request: Request, ...rest: A): Promise<Response> => {
    const res = await handler(request, ...rest);
    for (const [k, v] of Object.entries(expoCors(request))) res.headers.set(k, v);
    return res;
  };
}

/**
 * The signed-in student: a bearer token when one is sent (and then only the token: a bad one is no one,
 * never a fall-back to a cookie), else the Sigil session (getAuthedUser, held to the allow-list).
 */
export async function getAuthedUserOrToken(request: Request): Promise<AuthedUser | null> {
  const header = request.headers.get("authorization");
  if (!header) return getAuthedUser();
  const raw = extractBearerToken(header);
  if (!raw) return null;
  const cfg = oauthConfig();
  if (!cfg.enabled) return null;
  const found = await findAccessToken(hashToken(raw));
  const check = checkAccess(found, { now: new Date(), resources: acceptedResources(new URL(request.url).origin, cfg) });
  return check.ok && found ? { id: found.owner.id, email: null } : null;
}
