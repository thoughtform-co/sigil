---
name: sigil-stability-hardening
overview: Execute the multi-user stability and performance roadmap from the sentinel, starting with the highest-impact items that address concrete codebase gaps found in the audit.
todos:
  - id: wave1-bounded-queries
    content: Add take limits to all unbounded findMany calls across 11 API routes
    status: completed
  - id: wave1-sql-aggregation
    content: Move dashboard-stats, cost-report, and analytics/overview from JS aggregation to SQL GROUP BY with date-range params
    status: completed
  - id: wave1-middleware-auth
    content: Switch middleware.ts from getUser() to getSession() for cookie-only auth
    status: completed
  - id: wave2-server-timing
    content: Standardize Server-Timing headers on all API routes missing them
    status: completed
  - id: wave2-correlation-ids
    content: Add request correlation ID utility and wire into middleware
    status: completed
  - id: wave2-env-example
    content: Create .env.example with all required env var placeholders
    status: completed
  - id: wave3-migrate-data-uris
    content: "Create migration script to move inline data: URI outputs to Supabase Storage"
    status: completed
  - id: wave3-prevent-new-uris
    content: "Update generation output creation to upload to storage instead of inline data: URIs"
    status: completed
  - id: wave4-cache-headers
    content: Ensure all GET API routes use withCacheHeaders utility
    status: completed
  - id: wave4-suspense-boundaries
    content: Add Suspense streaming boundaries to dashboard, journeys, and journey detail pages
    status: completed
  - id: wave4-link-prefetch
    content: Enable Link prefetch on journey and route card components
    status: completed
  - id: wave5-idempotency
    content: Add idempotency keys to generation submissions to prevent duplicates
    status: completed
  - id: wave5-atomic-claiming
    content: Implement atomic job claiming with compare-and-set for background processing
    status: completed
isProject: false
---

# Sigil Stability and Performance Hardening

Priority-ordered execution plan derived from the [.sentinel.md](.sentinel.md) roadmap, scoped to concrete codebase gaps found during audit.

---

## Wave 1: Bounded Queries and Auth Efficiency (highest risk reduction)

**Problem:** 15+ `findMany` calls have no `take` limit. Three admin/analytics routes load all rows and aggregate in JS. Middleware calls `getUser()` (DB round trip) instead of `getSession()` (cookie-only).

### 1a. Add `take` limits to unbounded queries

Add `take` (or pagination params) to every `findMany` without one. Key files:

- [app/api/admin/cost-report/route.ts](app/api/admin/cost-report/route.ts) -- loads all users+generations
- [app/api/admin/dashboard-stats/route.ts](app/api/admin/dashboard-stats/route.ts) -- loads all outputs
- [app/api/analytics/overview/route.ts](app/api/analytics/overview/route.ts) -- loads 30 days of generations
- [app/api/admin/failed-generations/route.ts](app/api/admin/failed-generations/route.ts)
- [app/api/admin/cleanup-stuck-generations/route.ts](app/api/admin/cleanup-stuck-generations/route.ts)
- [app/api/admin/prompt-enhancements/route.ts](app/api/admin/prompt-enhancements/route.ts)
- [app/api/admin/users/route.ts](app/api/admin/users/route.ts)
- [app/api/admin/workspace-projects/route.ts](app/api/admin/workspace-projects/route.ts)
- [app/api/sessions/route.ts](app/api/sessions/route.ts)
- [app/api/projects/route.ts](app/api/projects/route.ts)
- [app/api/workflows/route.ts](app/api/workflows/route.ts)

### 1b. Move admin aggregation to SQL

Replace JS-side `for`/`reduce` loops with `prisma.$queryRaw` using `GROUP BY`:

- **dashboard-stats**: `GROUP BY file_type, user_id` with `COUNT(*)`
- **cost-report**: `GROUP BY user_id, model_id` with `SUM(cost)`, `COUNT(*)`
- **analytics/overview**: `GROUP BY DATE(created_at), status, model_id` with `COUNT(*)`

Each should accept `?from=` and `?to=` date-range query params.

### 1c. Switch middleware auth to `getSession()`

In [middleware.ts](middleware.ts), replace `supabase.auth.getUser()` (line ~64) with `supabase.auth.getSession()`. This avoids a DB round trip on every single request. Keep `getUser()` only in server components that need verified profile data.

---

## Wave 2: Observability Standardization

**Problem:** `Server-Timing` headers exist on ~6 routes but not all. No correlation IDs. No `.env.example`.

### 2a. Standardize `Server-Timing` on all API routes

Audit all `app/api/**/route.ts` files. Any GET/POST handler that hits the DB should include:

```
Server-Timing: auth;dur=X,query;dur=Y,total;dur=Z
```

Already done in: dashboard, journeys, generations, sessions, video-iterations. Missing from: admin routes, analytics, generate, models, projects, workflows, outputs.

### 2b. Add request correlation IDs

Create a small utility (`lib/api/correlation.ts`) that generates a unique ID per request and attaches it to:

- Response header (`X-Request-Id`)
- Any server-side logs or error reports
- Prisma query comments (optional, via `$queryRawUnsafe` comment prefix)

Wire it into [middleware.ts](middleware.ts) so every request gets an ID.

### 2c. Create `.env.example`

Add a `.env.example` file listing all required env vars (with placeholder values, no secrets) so new developers can onboard without guessing.

---

## Wave 3: Data Architecture -- Migrate Inline Data URIs

**Problem:** The root cause of the loading crisis was inline `data:image/...` base64 strings (up to 29MB) stored in `outputs.file_url`. The SQL filter `NOT LIKE 'data:%'` is a bandaid; the real fix is to move these to object storage.

### 3a. Create a migration script

Write a one-time script (`scripts/migrate-data-uris.ts`) that:

1. Queries all `outputs` where `file_url LIKE 'data:%'`
2. Decodes each base64 payload
3. Uploads to Supabase Storage (bucket: `generation-outputs`)
4. Updates `file_url` to the storage URL
5. Runs in batches of 10 with progress logging

### 3b. Update generation output creation

In the generation pipeline (wherever new outputs are created with `data:` URIs), upload to storage first and store the URL instead. This prevents new toxic payloads from entering the DB.

### 3c. Remove the SQL bandaid filter

Once migration is complete and no new `data:` URIs are being written, remove the `AND o.file_url NOT LIKE 'data:%'` clauses from:

- [lib/prefetch/dashboard.ts](lib/prefetch/dashboard.ts)
- [lib/prefetch/journeys.ts](lib/prefetch/journeys.ts)
- [app/api/journeys/[id]/route.ts](app/api/journeys/[id]/route.ts)

---

## Wave 4: Caching and Perceived Performance

### 4a. Add `Cache-Control` headers to read-only API routes

For authenticated read endpoints, set:

```
Cache-Control: private, max-age=10, stale-while-revalidate=30
```

The `withCacheHeaders` utility already exists in [lib/api/cache-headers.ts](lib/api/cache-headers.ts). Ensure all GET routes use it.

### 4b. Add `<Suspense>` streaming boundaries

Wrap data-dependent sections in `<Suspense>` with skeleton fallbacks so the navigation shell renders instantly:

- [app/dashboard/page.tsx](app/dashboard/page.tsx) -- wrap `DashboardView` in Suspense
- [app/journeys/page.tsx](app/journeys/page.tsx) -- wrap `JourneysOverviewContent` in Suspense
- [app/journeys/[id]/page.tsx](app/journeys/[id]/page.tsx) -- wrap detail content in Suspense

### 4c. Add `<Link prefetch>` on journey and route cards

Enable Next.js route prefetching on hover for the main navigation cards in:

- [components/journeys/JourneyCard.tsx](components/journeys/JourneyCard.tsx)
- [components/dashboard/RouteCardsPanel.tsx](components/dashboard/RouteCardsPanel.tsx)

---

## Wave 5: Generation Pipeline Hardening

### 5a. Add idempotency keys

Add a `clientRequestId` field to generation submissions. Before creating a new generation, check if one with the same key already exists. This prevents duplicate generations on retry/double-click.

### 5b. Atomic job claiming

For background processing (polling, webhooks), use compare-and-set:

```typescript
const locked = await prisma.generation.updateMany({
  where: { id, status: "pending", startedAt: null },
  data: { startedAt: new Date() },
});
if (locked.count === 0) return; // someone else owns it
```

### 5c. Enhance rate limiting

The existing in-memory rate limiter (30 req/min) in [lib/api/rate-limit.ts](lib/api/rate-limit.ts) resets on server restart and doesn't share across instances. For multi-user, add per-project limits and consider persisting to Redis or a DB counter.