import { NextResponse } from "next/server";

/**
 * In-memory rate limiter for API routes.
 * For production at scale, replace with Redis-backed (e.g. Upstash) or edge rate limiting.
 */

const windowMs = 60 * 1000; // 1 minute
const maxPerWindow: Record<string, number> = {
  generate: 30,
  upload: 20,
  "check-email": 10,
  "workshop-registration": 10,
  // Expo City's post office (app/api/expo/me, app/api/expo/answers).
  "expo-me": 30,
  "expo-answers": 10,
  // Expo City's character creator (app/api/expo/avatar/*): starting draws and keeping, then reading draws back while they run.
  "expo-avatar": 20,
  "expo-avatar-job": 120,
  // Expo City's live room (app/api/expo/live/ticket): one ticket per connection, an hour each; reconnects after a drop.
  "expo-live-ticket": 20,
};

const store = new Map<string, { count: number; resetAt: number }>();

function getKey(route: string, identifier: string): string {
  return `${route}:${identifier}`;
}

function cleanup(key: string, now: number): void {
  const entry = store.get(key);
  if (entry && entry.resetAt < now) store.delete(key);
}

/**
 * Check rate limit for a route. Returns null if allowed, or NextResponse (429) if exceeded.
 * @param route - One of "generate" | "upload"
 * @param identifier - User id or IP (server should pass getAuthedUser()?.id or request IP)
 */
export function checkRateLimit(route: string, identifier: string): NextResponse | null {
  const max = maxPerWindow[route] ?? 60;
  const now = Date.now();
  const key = getKey(route, identifier);
  cleanup(key, now);

  const entry = store.get(key);
  if (!entry) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }
  if (entry.count >= max) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return NextResponse.json(
      { error: "Too many requests", code: "rate_limited", retryAfter },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    );
  }
  entry.count += 1;
  return null;
}
