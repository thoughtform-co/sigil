import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureProfile, getAuthedUser } from "@/lib/auth/server";
import { claudeAccessFor } from "@/lib/oauth/claude-access";
import { oauthConfig } from "@/lib/oauth/config";
import { continuePage, htmlPage } from "@/lib/oauth/http";
import { clientKeyFor } from "@/lib/oauth/redirects";
import { codeRedirect, errorRedirect, verifyAuthRequest } from "@/lib/oauth/request";
import { prismaOAuthStore } from "@/lib/oauth/store-prisma";
import { issueCode } from "@/lib/oauth/tokens";

export const dynamic = "force-dynamic";

/**
 * POST /api/mcp/oauth/decision — the person's answer on `/connect`.
 *
 * A same-site form post: the Origin (or Referer) must be this site, the Supabase session must be
 * the person's, and the signed request must be unexpired. Allow finds or creates the person's one
 * connection for this client, issues a five-minute code and sends the browser back to the client.
 * Deny sends it back with `access_denied`. The way back is a small page, not a 303, because of
 * the site's `form-action 'self'` policy (see `continuePage`).
 */
function sameSite(request: NextRequest, origin: string): boolean {
  const from = request.headers.get("origin") || request.headers.get("referer");
  if (!from) return false;
  try {
    return new URL(from).origin === origin;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  const origin = new URL(request.url).origin;
  const cfg = oauthConfig();
  if (!cfg.enabled) {
    return htmlPage(503, "Sign-in is off", "Connecting Claude to Sigil is switched off right now.");
  }
  if (!sameSite(request, origin)) {
    return htmlPage(403, "This sign-in cannot continue", "The answer did not come from the Sigil page. Start again from Claude.");
  }
  const form = await request.formData().catch(() => null);
  const areq = form?.get("areq");
  const now = new Date();
  const req = verifyAuthRequest(areq, cfg.secret, Math.floor(now.getTime() / 1000));
  if (!req) {
    return htmlPage(
      400,
      "This sign-in expired",
      "Thirty minutes passed, or the link was changed. Go back to Claude and click Connect again.",
    );
  }
  if (form?.get("decision") !== "allow") {
    return continuePage(errorRedirect(req.redirectUri, origin, "access_denied", "The person declined.", req.state));
  }
  const user = await getAuthedUser();
  if (!user) {
    return htmlPage(401, "You are signed out", "Sign in to Sigil, then go back to Claude and click Connect again.");
  }
  await ensureProfile(user);
  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { id: true, role: true, isDisabled: true, mcpAccess: true },
  });
  if (claudeAccessFor(profile).state !== "allowed") {
    return continuePage(
      errorRedirect(req.redirectUri, origin, "access_denied", "Claude access is not turned on for this Sigil account.", req.state),
    );
  }
  const credential = await prismaOAuthStore.upsertCredential({
    ownerId: user.id,
    clientKey: clientKeyFor(req.redirectUri),
    clientId: req.clientId,
    clientName: req.clientName,
    subjectEmail: user.email ?? null,
  });
  const code = await issueCode(prismaOAuthStore, {
    request: req,
    profileId: user.id,
    credentialId: credential.id,
    now,
  });
  return continuePage(codeRedirect(req.redirectUri, origin, code, req.state));
}
