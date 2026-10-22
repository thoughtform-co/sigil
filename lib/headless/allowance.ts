/**
 * The daily allowance of work done through Claude: images and videos per person, per rolling
 * 24 hours. This is the spend control of the headless surface; nobody pays or brings a key.
 *
 *   MCP_DAILY_IMAGES   images a person may draw through Claude in 24 hours (default 60)
 *   MCP_DAILY_VIDEOS   videos a person may make through Claude in 24 hours (default 4)
 *   MCP_DAILY_3D       3D models a person may make through Claude in 24 hours (default 3)
 *
 * Admins are not limited. A failed draw does not count.
 */

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type AllowanceKind = "image" | "video" | "3d";

const DEFAULTS: Record<AllowanceKind, number> = { image: 60, video: 4, "3d": 3 };
const ENV_NAMES: Record<AllowanceKind, string> = { image: "MCP_DAILY_IMAGES", video: "MCP_DAILY_VIDEOS", "3d": "MCP_DAILY_3D" };
const NOUNS: Record<AllowanceKind, string> = { image: "images", video: "videos", "3d": "3D models" };
const WINDOW_MS = 24 * 60 * 60 * 1000;

export interface UsedRow {
  createdAt: Date;
  count: number;
}

export type AllowanceDecision =
  | { ok: true; used: number; limit: number | null }
  | { ok: false; used: number; limit: number; message: string };

export function dailyLimit(kind: AllowanceKind, env: NodeJS.ProcessEnv = process.env): number {
  const raw = Number(env[ENV_NAMES[kind]]);
  return Number.isFinite(raw) && raw >= 0 ? Math.floor(raw) : DEFAULTS[kind];
}

/** Pure: whether `requested` more fit, and when the next one frees up if not. */
export function decideAllowance(input: {
  kind: AllowanceKind;
  requested: number;
  rows: UsedRow[];
  limit: number;
  now: Date;
}): AllowanceDecision {
  const used = input.rows.reduce((sum, row) => sum + row.count, 0);
  if (used + input.requested <= input.limit) return { ok: true, used, limit: input.limit };
  const oldest = input.rows.reduce<Date | null>(
    (min, row) => (min === null || row.createdAt < min ? row.createdAt : min),
    null,
  );
  const freesAt = oldest ? new Date(oldest.getTime() + WINDOW_MS) : null;
  const minutes = freesAt ? Math.max(1, Math.ceil((freesAt.getTime() - input.now.getTime()) / 60_000)) : null;
  const wait =
    minutes === null ? "" : minutes >= 90 ? ` The next one frees up in about ${Math.round(minutes / 60)} hours.` : ` The next one frees up in about ${minutes} minutes.`;
  const noun = NOUNS[input.kind];
  return {
    ok: false,
    used,
    limit: input.limit,
    message: `Daily allowance reached: ${used} of ${input.limit} ${noun} used in the last 24 hours, and this asks for ${input.requested} more. Nothing was drawn.${wait}`,
  };
}

export async function checkAllowance(input: {
  ownerId: string;
  isAdmin: boolean;
  kind: AllowanceKind;
  requested: number;
  env?: NodeJS.ProcessEnv;
  now?: Date;
  /** A transaction to count in (the creator's reservation, lib/headless/avatar-jobs.ts). */
  db?: Pick<Prisma.TransactionClient, "generation">;
}): Promise<AllowanceDecision> {
  const now = input.now ?? new Date();
  const rows = await (input.db ?? prisma).generation.findMany({
    where: {
      userId: input.ownerId,
      source: "mcp",
      status: { not: "failed" },
      createdAt: { gt: new Date(now.getTime() - WINDOW_MS) },
      session: { type: input.kind },
    },
    select: { createdAt: true, parameters: true },
  });
  const used: UsedRow[] = rows.map((row) => {
    const n = Number((row.parameters as Record<string, unknown> | null)?.numOutputs);
    return { createdAt: row.createdAt, count: Number.isFinite(n) && n > 0 ? n : 1 };
  });
  if (input.isAdmin) return { ok: true, used: used.reduce((s, r) => s + r.count, 0), limit: null };
  return decideAllowance({
    kind: input.kind,
    requested: input.requested,
    rows: used,
    limit: dailyLimit(input.kind, input.env),
    now,
  });
}
