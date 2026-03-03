# Sigil Performance Improvement Plan

> **Context:** Benchmarking conducted on 2026-03-03 from a cloud VM against the Supabase-hosted PostgreSQL database in `eu-west-1`. Table sizes are small (4 workspace projects, 5 projects, 6 sessions, 27 generations, 21 outputs), yet page loads consistently exceed 10 seconds.

---

## Executive Summary

The primary bottleneck is **network latency to the remote database** (~600ms per round trip), amplified by sequential query chains, Prisma transaction overhead, and redundant client-side data refetching after server-side rendering. The actual SQL execution time for the most complex query is **0.127ms** — the database is idle while the network does all the work.

| Page | Current render time | After plan (estimated) |
|------|-------------------|----------------------|
| `/dashboard` | 9.7–15.9s | 1–2s |
| `/journeys` | 13.3–14.4s | 1–2s |
| `/journeys/[id]` | 1.7–4.5s | 0.5–1s |
| `/routes/[id]/image` | 4.4–6.1s | 1–2s |

---

## Benchmarking Data

### DB Round-Trip Latency

```
5 consecutive pings: 597ms, 598ms, 597ms, 598ms, 597ms → avg 597ms
Cold connect: 1389ms
```

### SQL Execution vs. Wall Clock

| Query | SQL execution (EXPLAIN ANALYZE) | Wall clock (including network) |
|-------|--------------------------------|-------------------------------|
| Dashboard thumbnail (3-way JOIN + ROW_NUMBER) | 0.127ms | 597–602ms |
| Profile findUnique | <1ms | 600ms |
| WorkspaceProjects findMany | <1ms | 843ms |

### Duplicate Request Pattern (from dev server logs)

Every page view triggers **two** full data loads — server-side prefetch, then client-side SWR revalidation:

```
GET /journeys        200 in 14.4s  (server render)
GET /api/journeys    200 in 12.3s  (client SWR refetch)

GET /journeys/[id]   200 in  4.9s
GET /api/journeys/.. 200 in  3.9s

GET /dashboard       200 in 15.9s
GET /api/admin/dashboard-stats 200 in 4.3s
```

---

## Root Causes (ordered by impact)

| # | Root Cause | Impact | Pages Affected |
|---|-----------|--------|----------------|
| 1 | ~600ms network latency per DB round trip (VM in US, DB in EU) | Every query pays 600ms minimum | All |
| 2 | Sequential query chains in prefetch functions (3 queries in series) | 1800ms+ minimum per page from queries alone | Dashboard, Journeys list |
| 3 | Client SWR refetches data that was already server-rendered | Doubles effective load time | Dashboard, Journeys, Journey detail |
| 4 | `force-dynamic` on key pages prevents any caching | Every visit is a cold render | Dashboard, Journeys list |
| 5 | Prisma transaction wrapping (BEGIN/DEALLOCATE ALL/COMMIT per query) | Additional round trips per query | All |
| 6 | Supabase session pooler (port 5432) instead of transaction pooler | Poor connection reuse under concurrency | All |
| 7 | Admin dashboard-stats loads all outputs without pagination | Grows linearly with data, already 4.3s | Dashboard (admin) |

---

## Implementation Plan

### Phase 1: Fix the Double Fetch (highest ROI, lowest risk)

**Goal:** Eliminate the redundant client-side API call that happens after every server render. This alone should cut perceived load time roughly in half.

**Estimated improvement:** 40–60% reduction in perceived load time.

#### Step 1.1: Audit SWR revalidation settings

**Files:**
- `components/dashboard/DashboardView.tsx`
- `components/journeys/JourneysOverviewContent.tsx`
- `components/journeys/JourneyDetailContent.tsx`

**What to do:**

1. In each component, find the SWR hook (likely `useSWR`) and check the `revalidateOnMount` option.
2. Verify that when `initialData` / `fallbackData` is provided, `revalidateOnMount` is explicitly `false`.
3. Check that `revalidateOnFocus` is `false` (otherwise switching browser tabs triggers a refetch).
4. Verify that the SWR cache key matches between server and client. If the key includes anything dynamic (e.g., a timestamp, user-agent, or randomly generated value), the client won't match the server cache entry and will refetch.

**Example pattern to enforce:**

```typescript
const { data } = useSWR(
  `/api/journeys`,
  fetcher,
  {
    fallbackData: initialJourneys ? { journeys: initialJourneys } : undefined,
    revalidateOnMount: !initialJourneys,
    revalidateOnFocus: false,
    dedupingInterval: 10_000,
  }
);
```

#### Step 1.2: Audit AuthProvider `/api/me` call

**File:** `context/AuthContext.tsx`

**What to do:**

1. The `AuthProvider` fires `fetch("/api/me")` on every page load via `useEffect`. In auth bypass / public demo mode, this is unnecessary overhead (~600ms+ for the DB query).
2. When `SIGIL_AUTH_BYPASS` or `SIGIL_PUBLIC_DEMO` is active, the server already knows the user. Pass auth state from the server component as a prop or via a serialized `<script>` tag, and skip the `/api/me` call entirely.
3. Even without bypass, consider passing the auth state from the server render to avoid the client round trip. This can be done via Next.js `cookies()` or a server component that serializes the user info into a client component prop.

**Implementation approach:**

```typescript
// In root layout or page, pass initial auth state:
<AuthProvider initialUser={{ id: user.id, email: user.email, role: profile.role }}>
  {children}
</AuthProvider>

// In AuthProvider, skip /api/me fetch if initialUser is provided:
if (initialUser) {
  setUser(initialUser);
  setRole(initialUser.role);
  setLoading(false);
  return; // skip supabase.auth.getSession() and hydrateFromMe()
}
```

#### Step 1.3: Verify serialization of `initialData`

**What to do:**

1. Add a temporary `console.log` in the client component to verify `initialData` is not `undefined` after hydration.
2. Check that all data in the prefetch return value is JSON-serializable (no `Date` objects, `BigInt`, `Decimal`, or `undefined` values that get stripped during serialization).
3. Prisma's `_count` fields, `Decimal` types, and `Date` objects are common serialization pitfalls. The prefetch functions already convert dates to `.toISOString()`, but verify nothing is missed.

---

### Phase 2: Parallelize and Reduce Query Count

**Goal:** Cut the number of sequential DB round trips from 3+ to 1–2 per page.

**Estimated improvement:** 30–50% reduction in server render time.

#### Step 2.1: Parallelize profile + main query in `prefetchDashboard`

**File:** `lib/prefetch/dashboard.ts`

**Current flow (sequential):**

```
1. profile = await prisma.profile.findUnique(...)    // ~600ms
2. workspaceProjects = await prisma.workspaceProject.findMany(...)  // ~600ms
3. thumbnails = await prisma.$queryRaw(...)           // ~600ms
Total: ~1800ms minimum
```

The profile query is needed to determine `isAdmin`, which controls the `where` clause for workspace projects. But this can be restructured.

**New flow (parallel where possible):**

```typescript
// Fetch profile and ALL workspace projects in parallel
const [profile, allWorkspaceProjects] = await Promise.all([
  prisma.profile.findUnique({
    where: { id: userId },
    select: { role: true },
  }),
  prisma.workspaceProject.findMany({
    orderBy: { updatedAt: "desc" },
    select: { /* existing select */ },
    // Include member info for filtering
    include: {
      members: {
        where: { userId },
        select: { userId: true },
      },
    },
  }),
]);

const isAdmin = profile?.role === "admin";
// Filter post-fetch instead of pre-fetch
const workspaceProjects = isAdmin
  ? allWorkspaceProjects
  : allWorkspaceProjects.filter(wp => wp.members.length > 0);

// Then thumbnails (still sequential, needs briefing IDs)
const thumbnails = await fetchThumbnails(workspaceProjects);
```

**Result:** 2 sequential steps instead of 3. Saves ~600ms.

**Trade-off:** Fetches all workspace projects for non-admin users and filters in JS. With small table sizes, this is negligible. If workspace_projects grows to thousands, revisit.

#### Step 2.2: Same optimization for `prefetchJourneysList`

**File:** `lib/prefetch/journeys.ts`

Apply the identical `Promise.all` pattern as Step 2.1.

#### Step 2.3: Combine into a single raw SQL query (optional, higher effort)

**Files:** `lib/prefetch/dashboard.ts`, `lib/prefetch/journeys.ts`

**What to do:**

Replace the 3-query chain with a single raw SQL query that fetches profile role, workspace projects with briefing counts, and thumbnails in one round trip.

```sql
WITH user_role AS (
  SELECT role FROM profiles WHERE id = $1
),
journeys AS (
  SELECT
    wp.id, wp.name, wp.description, wp.type,
    COUNT(DISTINCT p.id) AS route_count
  FROM workspace_projects wp
  LEFT JOIN projects p ON p.workspace_project_id = wp.id
  -- For non-admin: LEFT JOIN workspace_project_members wpm ON ...
  GROUP BY wp.id
  ORDER BY wp.updated_at DESC
),
thumbnails AS (
  SELECT ... (existing ROW_NUMBER query)
)
SELECT * FROM user_role, journeys
LEFT JOIN thumbnails ON ...
```

**Estimated improvement:** Reduces 3 round trips to 1. Saves ~1200ms per page.

**Trade-off:** Raw SQL is harder to maintain than Prisma queries. Recommend only if Phase 2.1 doesn't bring sufficient improvement.

#### Step 2.4: Parallelize profile + access filter in `prefetchWorkspaceData`

**File:** `lib/prefetch/workspace.ts`

This function already parallelizes `profile` + `projectAccessFilter` (line 21), which is good. But the subsequent `Promise.all([project, sessions, generations])` (line 61) depends on the access filter result. No change needed here — this is already well-structured.

---

### Phase 3: Enable Caching

**Goal:** Avoid re-running the full query chain on every request when data hasn't changed.

**Estimated improvement:** Near-instant loads for repeat visits within the cache window.

#### Step 3.1: Replace `force-dynamic` with ISR

**Files:**
- `app/dashboard/page.tsx`
- `app/journeys/page.tsx`

**Current:**

```typescript
export const dynamic = "force-dynamic";
```

**New:**

```typescript
export const revalidate = 30; // seconds
```

This tells Next.js to serve a cached version and revalidate in the background every 30 seconds. The first visitor after the cache expires gets a stale page instantly while a fresh one renders behind the scenes.

**Caveat:** ISR in App Router caches per-path, not per-user. Since this app uses auth bypass (all visitors are the same admin user), this is safe. If real multi-user auth is active, you'd need to use `cookies()` or `headers()` to make the cache user-specific, which effectively disables ISR. In that case, consider client-side caching strategies instead (see Step 3.2).

**Alternative if ISR doesn't fit:** Remove `force-dynamic` and let Next.js auto-detect the caching behavior. Since the pages call `cookies()` (via `getAuthedUser` → Supabase), Next.js will automatically opt out of static caching but may still apply request-level deduplication.

#### Step 3.2: Add server-side data cache layer

**New file:** `lib/cache/data-cache.ts`

**What to do:**

Create a simple in-memory TTL cache for prefetch results. This is more flexible than ISR and works with per-user data.

```typescript
const cache = new Map<string, { data: unknown; expiry: number }>();

export function getCached<T>(key: string, ttlMs: number, fetcher: () => Promise<T>): Promise<T> {
  const cached = cache.get(key);
  if (cached && cached.expiry > Date.now()) {
    return Promise.resolve(cached.data as T);
  }
  return fetcher().then((data) => {
    cache.set(key, { data, expiry: Date.now() + ttlMs });
    return data;
  });
}
```

**Usage:**

```typescript
export async function prefetchDashboard(userId: string) {
  return getCached(`dashboard:${userId}`, 10_000, async () => {
    // existing query logic
  });
}
```

**TTL guidelines:**
- Dashboard: 10–30s (overview data doesn't change frequently)
- Journeys list: 10–30s
- Journey detail: 5–10s (user may have just created a route)
- Route workspace: 2–5s (active generation session)

**Caveat:** This cache lives in the Node.js process. It resets on server restart and doesn't share across instances. For production with multiple instances, consider Redis or Next.js `unstable_cache`. For the dev server (single process), this is perfectly effective.

#### Step 3.3: Add HTTP Cache-Control headers for API routes

**Files:** API routes in `app/api/dashboard/`, `app/api/journeys/`, etc.

**What to do:**

The API routes already use a `withCacheHeaders` utility. Verify it sets appropriate headers:

```typescript
// For read-only data views:
Cache-Control: private, max-age=10, stale-while-revalidate=30

// For user-specific data:
Cache-Control: private, max-age=5
```

This allows the browser to serve cached API responses for a few seconds, preventing the double-fetch from hitting the server at all (even if SWR fires the request).

---

### Phase 4: Database Connection Optimization

**Goal:** Reduce per-query overhead from the Prisma ↔ PgBouncer protocol.

**Estimated improvement:** 10–30% reduction in per-query wall time.

#### Step 4.1: Switch to Supabase transaction pooler

**File:** `.env` (or secrets configuration)

**Current:**

```
DATABASE_URL=postgresql://...@aws-1-eu-west-1.pooler.supabase.com:5432/postgres
```

**New:**

```
DATABASE_URL=postgresql://...@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
```

**What this changes:**
- Port 5432 (session pooler) → Port 6543 (transaction pooler)
- `?pgbouncer=true` tells Prisma to adjust its prepared statement handling
- `?connection_limit=1` prevents Prisma from opening too many connections

The transaction pooler releases the backend connection after each transaction completes, enabling much better connection sharing across concurrent requests. This matters most under load.

**Caveat:** The `DIRECT_URL` should remain on port 5432 (or use the direct connection at port 5432 without the pooler) for migrations, since `prisma db push` and `prisma migrate` need a persistent connection.

#### Step 4.2: Disable Prisma query logging in development

**File:** `lib/prisma.ts`

**Current:**

```typescript
log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
```

**New:**

```typescript
log: process.env.PRISMA_LOG === "verbose"
  ? ["query", "error", "warn"]
  : ["error", "warn"],
```

The `["query"]` log level prints every SQL statement to stdout. This adds I/O overhead per query and makes the dev terminal noisy. Switch to opt-in via an environment variable.

#### Step 4.3: Consider Prisma Accelerate or connection pooling middleware

**Investigation task (no code change yet):**

[Prisma Accelerate](https://www.prisma.io/accelerate) is Prisma's managed edge caching and connection pooling layer. It sits between your app and the database, providing:
- Connection pooling at the edge
- Query result caching with configurable TTL
- Reduced cold-start latency

Evaluate whether this would be beneficial for the Sigil use case. The cost/benefit depends on deployment topology and query patterns.

---

### Phase 5: Co-locate Compute with Database

**Goal:** Reduce the ~600ms round trip to ~5–10ms by deploying Next.js in the same AWS region as the database.

**Estimated improvement:** 95%+ reduction in query latency. This is the single highest-impact change.

#### Step 5.1: Deploy Next.js to EU

**What to do:**

If deploying on Vercel:
- Set the function region to `eu-west-1` (Ireland) to match the Supabase database
- Vercel Dashboard → Project Settings → Functions → Region

If deploying on another platform (Railway, Fly.io, AWS, etc.):
- Ensure the compute instance is in `eu-west-1`

**Impact:** Every query drops from ~600ms to ~5ms. The 3-query sequential chain in `prefetchDashboard` goes from ~1800ms to ~15ms.

#### Step 5.2: Consider Supabase Edge Functions for API routes

**Investigation task:**

For API routes that are purely data-fetching (no heavy compute), consider moving them to Supabase Edge Functions, which run in the same datacenter as the database. This eliminates network latency entirely for those routes.

---

### Phase 6: Admin Query Optimization (scaling prep)

**Goal:** Prevent admin-only queries from becoming bottlenecks as data grows.

**Estimated improvement:** Prevents future degradation; minimal current impact (small data).

#### Step 6.1: Add pagination and date filtering to dashboard-stats

**File:** `app/api/admin/dashboard-stats/route.ts`

**Current:**

```typescript
const outputsWithUser = await prisma.output.findMany({
  where: {
    OR: [
      { fileType: { startsWith: "image" } },
      { fileType: { startsWith: "video" } },
    ],
  },
  select: { fileType: true, generation: { select: { userId: true } } },
});
```

**New:** Add a time window (e.g., last 30 days) and use SQL aggregation instead of loading all rows:

```typescript
const stats = await prisma.$queryRaw`
  SELECT
    CASE WHEN o.file_type LIKE 'image%' THEN 'image' ELSE 'video' END AS type,
    g.user_id,
    COUNT(*) AS count
  FROM outputs o
  INNER JOIN generations g ON g.id = o.generation_id
  WHERE g.created_at >= NOW() - INTERVAL '30 days'
    AND (o.file_type LIKE 'image%' OR o.file_type LIKE 'video%')
  GROUP BY 1, 2
`;
```

#### Step 6.2: Add pagination to cost-report

**File:** `app/api/admin/cost-report/route.ts`

**Current:** Loads ALL generations for ALL users without limits.

**New:** Add date range parameters and paginate by user:

```typescript
// Accept query params: ?from=2026-01-01&to=2026-03-01&page=1
const generations = await prisma.generation.findMany({
  where: {
    createdAt: { gte: from, lte: to },
    userId: user.id,
  },
  select: { cost: true, modelId: true, createdAt: true },
});
```

#### Step 6.3: Replace JS aggregation in analytics overview

**File:** `app/api/analytics/overview/route.ts`

**Current:** Loads all generations in 30 days and aggregates in JavaScript.

**New:** Push aggregation to SQL:

```typescript
const dailyStats = await prisma.$queryRaw`
  SELECT
    DATE(created_at) AS day,
    status,
    model_id,
    COUNT(*) AS count,
    SUM(cost) AS total_cost
  FROM generations
  WHERE created_at >= NOW() - INTERVAL '30 days'
  GROUP BY 1, 2, 3
  ORDER BY 1
`;
```

---

### Phase 7: Client-Side UX Improvements

**Goal:** Make the app feel faster even before backend optimizations land.

#### Step 7.1: Add optimistic navigation with loading skeletons

**What to do:**

The app already has `loading.tsx` files for dashboard and journeys. Verify they render immediately (they should, since Next.js shows them during server render). Consider making them more visually informative:

- Show skeleton cards matching the layout of the actual content
- Include a subtle shimmer animation
- Show the navigation frame immediately (it doesn't need data)

#### Step 7.2: Prefetch adjacent routes on hover

**What to do:**

Use Next.js `<Link prefetch>` on journey cards and route cards. When a user hovers over a card, Next.js will start loading that page in the background, so the navigation feels instant.

```tsx
<Link href={`/journeys/${id}`} prefetch>
  <JourneyCard ... />
</Link>
```

#### Step 7.3: Use `startTransition` for non-urgent updates

**What to do:**

Wrap non-critical state updates (e.g., analytics, admin stats) in `startTransition` so they don't block the main content from rendering:

```typescript
import { startTransition } from "react";

startTransition(() => {
  mutate("/api/admin/dashboard-stats");
});
```

---

## Implementation Priority Matrix

| Phase | Effort | Impact | Risk | Recommended Order |
|-------|--------|--------|------|-------------------|
| **Phase 1:** Fix double fetch | Low (1–2 days) | High (40–60% improvement) | Very Low | **Do first** |
| **Phase 2:** Parallelize queries | Low (1 day) | Medium (30–50% on affected pages) | Low | **Do second** |
| **Phase 5:** Co-locate compute | Low (config change) | Very High (95% latency reduction) | Low | **Do third (production)** |
| **Phase 3:** Enable caching | Medium (2–3 days) | High (near-instant repeat loads) | Medium | Do fourth |
| **Phase 4:** DB connection optimization | Low (1 day) | Low–Medium (10–30%) | Low | Do fifth |
| **Phase 7:** Client-side UX | Low (1 day) | Medium (perceived speed) | Very Low | Do anytime |
| **Phase 6:** Admin query optimization | Medium (1–2 days) | Low now, High later | Low | Do when data grows |

---

## Validation Plan

After each phase, measure the improvement using:

### Quick benchmark script

```bash
# Run from a terminal with access to the dev server:
for path in /dashboard /journeys /journeys/<JOURNEY_ID>; do
  echo "--- $path ---"
  curl -s -o /dev/null -w "TTFB: %{time_starttransfer}s | Total: %{time_total}s\n" http://localhost:3000$path
done
```

### What to track

| Metric | How to measure | Target |
|--------|---------------|--------|
| Server render time | Next.js dev logs (`render: Xs`) | <2s for all pages |
| TTFB | `curl -w "%{time_starttransfer}"` | <1s |
| Duplicate API calls | Browser DevTools Network tab | Zero after SSR |
| DB queries per page | Prisma query log count | ≤2 per page |

### Expected results after full plan

| Page | Before | After Phase 1+2 | After all phases |
|------|--------|-----------------|-----------------|
| `/dashboard` | 10–16s | 3–5s | <500ms |
| `/journeys` | 13–14s | 4–6s | <500ms |
| `/journeys/[id]` | 2–5s | 1–2s | <200ms |
| `/routes/[id]/image` | 4–6s | 2–3s | <500ms |

The "after all phases" column assumes compute is co-located with the database (Phase 5), which drops the ~600ms round trip to ~5ms.

---

## Files Modified Per Phase

| Phase | Files |
|-------|-------|
| 1.1 | `components/dashboard/DashboardView.tsx`, `components/journeys/JourneysOverviewContent.tsx`, `components/journeys/JourneyDetailContent.tsx` |
| 1.2 | `context/AuthContext.tsx`, `app/layout.tsx` (or relevant page) |
| 1.3 | Prefetch files (temporary logging only) |
| 2.1 | `lib/prefetch/dashboard.ts` |
| 2.2 | `lib/prefetch/journeys.ts` |
| 2.3 | `lib/prefetch/dashboard.ts`, `lib/prefetch/journeys.ts` (optional) |
| 3.1 | `app/dashboard/page.tsx`, `app/journeys/page.tsx` |
| 3.2 | New file: `lib/cache/data-cache.ts`, prefetch files |
| 3.3 | API route files |
| 4.1 | Environment configuration / secrets |
| 4.2 | `lib/prisma.ts` |
| 5.1 | Deployment configuration (Vercel/hosting) |
| 6.1 | `app/api/admin/dashboard-stats/route.ts` |
| 6.2 | `app/api/admin/cost-report/route.ts` |
| 6.3 | `app/api/analytics/overview/route.ts` |
| 7.1 | `app/dashboard/loading.tsx`, `app/journeys/loading.tsx` |
| 7.2 | Journey/route card components |
| 7.3 | Dashboard client components |
