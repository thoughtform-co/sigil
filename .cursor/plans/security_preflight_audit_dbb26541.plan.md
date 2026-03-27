---
name: security preflight audit
overview: Read-only stack-security-preflight audit for the Next.js/Supabase/Vercel app. The highest-risk issues are a production-capable demo-admin bypass, an under-protected generation processor endpoint, and potentially cross-user Realtime leakage; there are also medium-severity issues around public media storage, auth logging, allowlist enumeration, and missing source-controlled RLS/migrations.
todos:
  - id: remove-demo-bypass
    content: Eliminate or strictly environment-gate the PUBLIC_DEMO / admin bypass path in middleware and server auth helpers.
    status: completed
  - id: secure-processor-and-realtime
    content: Make generate/process internal-only or fully authorized, and replace shared Realtime broadcasts with private scoped channels.
    status: completed
  - id: codify-db-storage-security
    content: Backfill source-controlled Supabase/Prisma migration coverage for RLS, storage policy, and bucket privacy posture.
    status: completed
  - id: harden-public-auth-surfaces
    content: Sanitize auth callback logging, rate-limit and redesign check-email, and review cache headers on privileged endpoints.
    status: completed
isProject: false
---

# Stack Security Preflight

## Findings

- `Critical` Production-capable auth/admin bypass via [middleware.ts](middleware.ts) and [lib/auth/server.ts](lib/auth/server.ts). `SIGIL_PUBLIC_DEMO=true` skips auth in middleware and causes `getAuthedUser()` to upsert and return an admin identity for every visitor.

```18:24:middleware.ts
const PUBLIC_DEMO = process.env.SIGIL_PUBLIC_DEMO === "true";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (AUTH_BYPASS || PUBLIC_DEMO) {
    return withCorrelationId(request, NextResponse.next({ request }));
  }
```

```23:31:lib/auth/server.ts
export const getAuthedUser = cache(async (): Promise<AuthedUser | null> => {
  if (AUTH_BYPASS || PUBLIC_DEMO) {
    if (PUBLIC_DEMO && !demoWarned) {
      demoWarned = true;
      console.warn("[SIGIL] PUBLIC_DEMO mode active — all visitors treated as demo admin. Disable SIGIL_PUBLIC_DEMO before production use.");
    }
```

- `High` Internal-looking processor route is exposed as a normal authenticated API in [app/api/generate/process/route.ts](app/api/generate/process/route.ts) with no ownership/project authorization on `generationId`. Any signed-in user who learns another generation UUID can claim/process it and trigger provider work.

```120:145:app/api/generate/process/route.ts
const generation = await prisma.generation.findUnique({
  where: { id: parsed.data.generationId },
  select: {
    id: true,
    sessionId: true,
    modelId: true,
    prompt: true,
    negativePrompt: true,
    parameters: true,
    status: true,
    userId: true,
  },
});

const lock = await prisma.generation.updateMany({
  where: { id: generation.id, status: "processing" },
```

- `High` Realtime generation updates are broadcast on one shared topic in [lib/supabase/realtime.ts](lib/supabase/realtime.ts) and filtered only after they reach the browser in [hooks/useGenerationsRealtime.ts](hooks/useGenerationsRealtime.ts). If the channel is not private with Realtime auth policies, prompts/output URLs/status can leak across users.

```35:43:lib/supabase/realtime.ts
export function broadcastGenerationUpdate(payload: BroadcastGenerationPayload): void {
  try {
    const supabase = createAdminClient();
    const channel = supabase.channel(CHANNEL_NAME);
    channel.send({
      type: "broadcast",
      event: EVENT_GENERATION,
      payload,
    });
```

- `High` Database security posture is not source-controlled. There are no files in [supabase/migrations/](supabase/migrations/) and no files in [prisma/migrations/](prisma/migrations/), while [package.json](package.json) and [README.md](README.md) rely on `prisma db push`. That means RLS, storage policies, and schema drift cannot be audited from the repo.
- `Medium` Media storage is public by default in [lib/supabase/storage.ts](lib/supabase/storage.ts); both `outputs` and `references` buckets are auto-created with `public: true`, and reference uploads return permanent public URLs.
- `Medium` Auth callback logs raw query params in [app/auth/callback/route.ts](app/auth/callback/route.ts), including `code` / `token_hash` on failure.
- `Medium` Email allowlist enumeration endpoint in [app/api/auth/check-email/route.ts](app/api/auth/check-email/route.ts) is public, unthrottled, and returns a boolean membership oracle.
- `Low` Admin dashboard stats likely use public/shared cache headers under [app/api/admin/dashboard-stats/route.ts](app/api/admin/dashboard-stats/route.ts) via [lib/api/cache-headers.ts](lib/api/cache-headers.ts).

## Positive Controls

- [app/api/generate/route.ts](app/api/generate/route.ts) is relatively strong: auth, rate limiting, schema validation, and project access checks are present.
- [next.config.ts](next.config.ts) already sets `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, and `Permissions-Policy`.
- [lib/security/url-safety.ts](lib/security/url-safety.ts) contains solid SSRF protections for server-side fetches.
- The lockfile currently resolves `next` to `16.1.6` in [package-lock.json](package-lock.json), which appears beyond the 2026 RSC/DoS patch baseline from the external advisory check.

## Recommended Remediation Order

1. Remove or strictly production-gate the demo/admin bypass in [middleware.ts](middleware.ts) and [lib/auth/server.ts](lib/auth/server.ts).
2. Lock down [app/api/generate/process/route.ts](app/api/generate/process/route.ts) as an internal worker surface and add object-level authorization.
3. Replace shared Realtime broadcasts with private, scoped channels and auth-enforced subscriptions.
4. Codify DB/storage security in versioned migrations: RLS, policies, bucket privacy, and any dashboard-only drift.
5. Harden public/auth-adjacent edges: sanitize auth callback logging, rate-limit and de-oracle `check-email`, and make admin caches private/no-store.

## Scope Notes

- This was a repo-first audit guided by the `stack-security-preflight` checklist.
- Live Supabase RLS/policies, HSTS/CSP headers from production responses, and Vercel preview protection were not fully verifiable from code alone, so any dashboard-only hardening should currently be treated as unmanaged drift until codified in the repo.

