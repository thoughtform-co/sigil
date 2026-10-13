/**
 * Authentication for the Sigil MCP server (`/api/mcp`).
 *
 * The only credential is a one-hour access token from the per-person sign-in (`sgl_oat_…`,
 * lib/oauth), sent in the `Authorization` header. There are no static API tokens: nobody is ever
 * handed a key to paste into a file. A request without a valid token gets a 401 whose
 * `WWW-Authenticate` names the protected-resource document, which is how Claude knows to open
 * the sign-in.
 */

import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ACCESS_TOKEN_PREFIX, oauthConfig } from "@/lib/oauth/config";
import { acceptedResources, challengeHeader } from "@/lib/oauth/metadata";
import { findAccessToken } from "@/lib/oauth/store-prisma";
import { checkAccess, hashToken } from "@/lib/oauth/tokens";
import { checkAndIncrementHeadlessRate, rateLimitHeaders } from "./rate-limit";

export interface HeadlessPrincipal {
  credentialId: string;
  ownerId: string;
  ownerRole: string;
}

export type VerifyResult =
  | { ok: true; principal: HeadlessPrincipal; headers: Record<string, string> }
  | { ok: false; response: NextResponse };

const ACCESS_TOKEN_PATTERN = /^sgl_oat_[A-Za-z0-9_-]{43}$/;

/** The bearer token of an `Authorization` header when it has the shape of a Sigil access token. */
export function extractBearerToken(header: string | null): string | null {
  if (!header) return null;
  const match = /^Bearer\s+(\S+)$/i.exec(header.trim());
  if (!match) return null;
  const token = match[1];
  if (!token.startsWith(ACCESS_TOKEN_PREFIX)) return null;
  return ACCESS_TOKEN_PATTERN.test(token) ? token : null;
}

function deny(status: number, error: string, headers?: Record<string, string>): VerifyResult {
  return { ok: false, response: NextResponse.json({ error, errorCategory: "auth" }, { status, headers }) };
}

export async function verifyMcpRequest(request: Request): Promise<VerifyResult> {
  const cfg = oauthConfig();
  const origin = new URL(request.url).origin;
  const challenge = (invalid?: string): Record<string, string> | undefined =>
    cfg.enabled ? { "WWW-Authenticate": challengeHeader(origin, invalid) } : undefined;

  if (!cfg.enabled) {
    return deny(503, "Connecting Claude to Sigil is switched off on this server.");
  }

  const rawToken = extractBearerToken(request.headers.get("authorization"));
  if (!rawToken) {
    return deny(401, "Sign in to Sigil to use this connector.", challenge());
  }

  const found = await findAccessToken(hashToken(rawToken));
  const check = checkAccess(found, { now: new Date(), resources: acceptedResources(origin, cfg) });
  if (!check.ok) {
    return deny(check.status, check.message, check.invalidToken ? challenge(check.message) : undefined);
  }
  const { credential, owner } = found!;

  const decision = await checkAndIncrementHeadlessRate(credential.id, {
    rateLimitPerMinute: credential.rateLimitPerMinute,
    rateLimitPerDay: credential.rateLimitPerDay,
  });
  const headers = rateLimitHeaders(decision);
  if (!decision.allowed) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Too many requests from this connection. Try again shortly.", errorCategory: "rate_limited" },
        { status: 429, headers },
      ),
    };
  }

  // Lets an admin spot connections nobody uses any more. Awaited, never left running after the
  // response: a write frozen with the function holds a database connection.
  await prisma.headlessCredential
    .update({ where: { id: credential.id }, data: { lastUsedAt: new Date() } })
    .catch(() => undefined);

  return {
    ok: true,
    principal: { credentialId: credential.id, ownerId: owner.id, ownerRole: owner.role },
    headers,
  };
}

/** One audit row per tool call. Never blocks or fails the call itself. */
export async function recordHeadlessUsage(input: {
  credentialId: string;
  ownerId: string;
  toolName: string;
  modelId?: string | null;
  status: "success" | "error" | "refused";
  errorCategory?: string | null;
  durationMs: number;
  costUsd?: number | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await prisma.headlessUsageLog.create({
      data: {
        credentialId: input.credentialId,
        ownerId: input.ownerId,
        toolName: input.toolName,
        modelId: input.modelId ?? null,
        status: input.status,
        errorCategory: input.errorCategory ?? null,
        durationMs: Math.max(0, Math.round(input.durationMs)),
        costUsd: input.costUsd ?? null,
        metadata: (input.metadata as Prisma.InputJsonValue | undefined) ?? Prisma.JsonNull,
      },
    });
  } catch (err) {
    console.warn("[headless] Failed to write usage log", err instanceof Error ? err.message : err);
  }
}
