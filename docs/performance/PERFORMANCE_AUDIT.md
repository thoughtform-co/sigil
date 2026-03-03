# Sigil Performance Audit — Pattern Analysis and Simplification

> **Date:** 2026-03-03
> **Scope:** Last 10 days of performance commits, 6 Cursor performance plans, and current codebase state.
> **Anchor:** [PERFORMANCE_PLAN.md](PERFORMANCE_PLAN.md) (the master plan benchmarked 2026-03-03)

---

## 1. Evidence Matrix

Each performance commit from the last 10 days, mapped to tactic, layer touched, measured evidence, and verdict.

| # | Commit | Date | Tactic | Layer | Measured? | Verdict |
|---|--------|------|--------|-------|-----------|---------|
| 1 | `e0e2786` | Feb 25 | Parallelize dashboard queries, SWR caching, Next.js Image, Server-Timing | API + client + config | Partial (Server-Timing added) | **Keep** — foundational |
| 2 | `00df225` | Feb 25 | Infinite scroll, virtual scrolling, optimistic insert, dynamic imports, server prefetch | Client UI + API + pages | No before/after delta | **Keep but audit** — adds significant complexity (4 distinct UI patterns at once) |
| 3 | `c7a0bc5` | Feb 24 | Workspace projects, cost governance, perf improvements (Phase 2B/4B/6/7) | API + schema + admin | No perf measurement | **Keep** — structural |
| 4 | `5cf0bce` | Mar 2 | Auth dedup, unified route bootstrap, cache policy, loading boundaries, slim APIs, isolate generation runtime | Auth + middleware + API + route pages + cache | Client marks + Server-Timing | **Keep** — broadest single change; highest risk of cross-layer interactions |
| 5 | `16083b2` | Mar 2 | Server-side prefetch for pages, Promise.all queries, dynamic imports, build config | Pages + API + config | No before/after delta | **Keep** — core server-prefetch pattern |
| 6 | `fe27a33` | Mar 2 | Dashboard prefetch improvements, non-blocking fallback | Prefetch + page | No measurement | **Keep** |
| 7 | `7024c4f` | Mar 2 | Debug instrumentation spike (diagnostic) | API diagnostics | Temporary | **Removed** — removed in next commit |
| 8 | `cad529a` | Mar 2 | Journeys loading optimization, remove debug instrumentation | Journeys + cleanup | Implicit | **Keep** |
| 9 | `ba7373d` | Mar 3 | Add `force-dynamic` to dashboard and journeys pages | Page rendering config | Build-time fix | **Conflicting** — blocks all caching (Phase 3 of master plan). Added to fix ISR prerender error rather than addressing root cause. |
| 10 | `1ceea5b` | Mar 3 | Disable Link prefetch storm, slim payloads, LATERAL SQL thumbnails, Prisma warmup | Client + SQL + Prisma config | No before/after delta | **Keep** |
| 11 | `9305ea0` | Mar 3 | Skip thumbnails on server render, LATERAL SQL for API thumbnails | Prefetch + API SQL | No measurement | **Conflicting** — introduced `initialDataIncludesThumbnails` flag, which adds conditional complexity to SWR revalidation |
| 12 | `58c3942` | Mar 3 | Eliminate double-fetch, batch video iterations, VideoIterationCountsContext | SWR + API + context | No measurement | **Keep** — video iteration batching is solid |

### Churn Hotspots

Files touched 4+ times in 10 days for performance work:

| File | Touches | Concern |
|------|---------|---------|
| `app/dashboard/page.tsx` | 7 | Strategy toggling (prefetch shape, dynamic directive, initial data flags) |
| `lib/prefetch/dashboard.ts` | 6 | Query shape rewritten repeatedly (include/exclude thumbnails, SQL approach) |
| `app/journeys/page.tsx` | 5 | Same toggling as dashboard |
| `lib/prefetch/journeys.ts` | 4 | Mirrored dashboard churn |
| `app/api/journeys/route.ts` | 4 | Duplicate of prefetch logic, independently modified |
| `lib/auth/server.ts` | 4 | Auth approach shifted multiple times |

### What Was Never Measured

- No commit includes a before/after timing comparison in the commit message or PR.
- Debug instrumentation was added (`7024c4f`) and immediately removed (`cad529a`), indicating ad-hoc profiling rather than persistent observability.
- The master plan's validation script (curl-based TTFB measurement) has not been run in any commit.
- No CI performance budget or regression gate exists.

---

## 2. Deduplicated Strategy Map

Six Cursor plans overlap heavily. This map shows which tactic appears in which plan, whether it was implemented, and whether a gap remains.

| Tactic | Plans | Implemented? | Gap? |
|--------|-------|-------------|------|
| Server-side prefetch (pages call Prisma directly, pass initialData) | Recovery-3892, Recovery-44720, Journeys-perf | Yes | No |
| Promise.all parallelization in prefetch functions | Dashboard-perf, Recovery-3892, Master-plan Phase 2 | **No — prefetch functions are still sequential** | **Yes** |
| SWR with fallbackData (client receives server data, doesn't refetch) | Recovery-3892, Vesper-grade | Dashboard: yes. **Journeys: no** (uses manual useState/fetch) | **Yes** |
| Eliminate `/api/me` client call when server already has user | Recovery-44720, Journeys-perf, Master-plan Phase 1.2 | **No — AuthContext still calls `/api/me` every page load** | **Yes** |
| Disable Link prefetch on expensive cards | Recovery-44720, Journeys-perf | Yes (`prefetch={false}` on JourneyCard, RouteCard) | No |
| LATERAL SQL for thumbnails | Journeys-perf, Master-plan Phase 2.3 | Yes (both dashboard and journeys API routes) | No |
| Replace `force-dynamic` with ISR or auto-detect | Master-plan Phase 3.1 | **No — force-dynamic still present on both pages** | **Yes** |
| Server-side TTL data cache | Master-plan Phase 3.2 | **No** | Not started |
| Cache-Control headers on API routes | Dashboard-perf, Hardening, Master-plan Phase 3.3 | Yes (`withCacheHeaders` utility) | No |
| Prisma warmup with retry/backoff | Journeys-perf | Yes (`lib/prisma.ts` warmup) | No |
| Transaction pooler (port 6543) | Master-plan Phase 4.1 | Warning added in `lib/prisma.ts`, not enforced | Partial |
| Dynamic imports for heavy components | Vesper-grade, Recovery-3892 | Yes (JourneyPanel, RouteCardsPanel, workspace modals) | No |
| Video iterations batching (context provider) | Recovery-44720, Hardening | Yes (`VideoIterationCountsContext`) | No |
| Loading boundaries (`loading.tsx`) | Recovery-44720 | Yes | No |
| Admin query optimization (pagination, SQL aggregation) | Master-plan Phase 6 | **No** | Future |
| Co-locate compute with database (deploy to eu-west-1) | Master-plan Phase 5 | **No** | Config change |

### Conflicting Strategies Across Plans

1. **Prefetch policy**: Some plans add hot-path prefetch (Dashboard-perf: "prefetch likely-next data"), others explicitly disable it (Journeys-perf: "disable Link prefetch storm"). Resolution: disable eager prefetch, keep lazy user-triggered prefetch.
2. **Thumbnail inclusion**: Recovery-44720 says "skip thumbnails on server render," but Journeys-perf says "include LATERAL SQL thumbnails in prefetch." Current code includes thumbnails in prefetch but flags `initialDataIncludesThumbnails=true`, making SWR skip refetch. The flag adds indirection for zero benefit if thumbnails are always included.
3. **force-dynamic vs caching**: `ba7373d` added force-dynamic to fix ISR prerender errors. Master plan Phase 3 wants ISR. These directly conflict. Root cause: ISR prerender calls `cookies()` via auth, which auto-opts out of static rendering anyway — `force-dynamic` is redundant and prevents any Next.js caching optimization.

---

## 3. Canonical Loading Contracts

Each major surface should have one clear data-loading architecture. No surface should use two different patterns.

### Contract: Dashboard (`/dashboard`)

```
SSR: app/dashboard/page.tsx (server component)
  └─ getAuthedUser() [React.cache deduplicated]
  └─ prefetchDashboard(userId) → { data, isAdmin }
  └─ Render NavigationFrame + DashboardView with initialData

Client hydration: DashboardView
  └─ useSWR("/api/dashboard", { fallbackData: initialData })
  └─ revalidateOnMount: false (server data is authoritative)
  └─ revalidateOnFocus: false
  └─ dedupingInterval: 60_000

API revalidation: GET /api/dashboard
  └─ getAuthedUser()
  └─ Same query as prefetch (shared function)
  └─ Cache-Control: private, max-age=10

Thumbnail policy: included in prefetch, no separate endpoint needed at current scale.
```

**Current state vs contract:**
- Prefetch queries are sequential (profile → projects → thumbnails). **Fix: parallelize profile + projects.**
- DashboardView has `revalidateOnMount: !initialData || !initialDataIncludesThumbnails` — since both are always truthy, simplify to `revalidateOnMount: false`.
- API route duplicates prefetch query logic independently. **Fix: share the query function.**

### Contract: Journeys List (`/journeys`)

```
SSR: app/journeys/page.tsx (server component)
  └─ getAuthedUser() [React.cache deduplicated]
  └─ prefetchJourneysList(userId) → { journeys, isAdmin }
  └─ Render NavigationFrame + JourneysOverviewContent with initialJourneys

Client hydration: JourneysOverviewContent
  └─ useSWR("/api/journeys", { fallbackData: { journeys: initialJourneys } })
  └─ revalidateOnMount: false
  └─ revalidateOnFocus: false
  └─ dedupingInterval: 60_000

API revalidation: GET /api/journeys
  └─ getAuthedUser()
  └─ Same query as prefetch (shared function)
  └─ Cache-Control: private, max-age=10

Thumbnail policy: included via LATERAL SQL, same as dashboard.
```

**Current state vs contract:**
- JourneysOverviewContent does **NOT** use SWR — uses manual useState + useEffect + fetch. **This is the single biggest architectural gap.** It means journeys don't benefit from dedup, stale-while-revalidate, or cache-aware refetch.
- Prefetch queries are sequential (same as dashboard). **Fix: parallelize.**
- Manual fetch in useEffect skips the initial fetch when `initialJourneys` is present but doesn't cache — navigating away and back triggers a full refetch.

### Contract: Journey Detail (`/journeys/[id]`)

```
SSR: app/journeys/[id]/page.tsx (server component)
  └─ getAuthedUser()
  └─ prefetchJourneyDetail(userId, journeyId) → { data, isAdmin }
  └─ Render appropriate hub component with initial data

Client hydration: JourneyDetailContent (or equivalent)
  └─ useSWR(`/api/journeys/${id}`, { fallbackData: initialData })
  └─ revalidateOnMount: false
  └─ revalidateOnFocus: false

API: GET /api/journeys/[id]
  └─ Same query as prefetch (shared function)
  └─ Cache-Control: private, max-age=10
```

**Current state:** prefetchJourneyDetail already parallelizes profile + journey. Reasonably well-structured.

### Contract: Route Workspace (`/routes/[id]/*`)

```
SSR: app/routes/[id]/layout.tsx (server component)
  └─ prefetchWorkspaceData(id) → project, sessions, generationsPage
  └─ Render via WorkspacePrefetchProvider

Client hydration: ProjectWorkspace
  └─ useSWR for sessions (fallbackData from prefetch)
  └─ useSWRInfinite for generations (fallbackData from prefetch)
  └─ revalidateOnMount: !hasPrefetch

API: existing session/generation endpoints
  └─ Cache-Control: private, max-age=10
```

**Current state:** workspace prefetch is the best-structured surface. It already parallelizes (profile + accessFilter, then project + sessions + generations). The main issue is `RequireAuth` client wrapper adding a redundant auth gate — server already redirects unauthenticated users.

### Contract: Auth (Global)

```
Server: getAuthedUser() [React.cache — deduped per request]
  └─ In bypass/demo mode: returns hardcoded user immediately (no DB after first call)
  └─ In production: supabase.auth.getUser()

Middleware: lightweight — bypass/demo skip, API routes skip, page routes do auth redirect only.

Client: AuthProvider
  └─ Should receive initialUser from server (role, id, email)
  └─ Should NOT call /api/me when initialUser is provided
  └─ /api/me only as fallback for client-side navigation without server render
```

**Current state vs contract:**
- AuthProvider always calls `/api/me` via `hydrateFromMe()`. This fires on every page load, adding ~600ms+ (one full DB round trip for profile lookup). **This is the second biggest gap.**
- The server already has the user. `app/layout.tsx` renders `<AuthProvider>` without passing any server-side user data.

---

## 4. Debt to Remove (Before Adding New Optimizations)

Ranked by impact and difficulty.

### Tier 1: Remove Now (High Impact, Low Risk)

**4.1 Convert JourneysOverviewContent from manual fetch to SWR**

The journeys page is the only major surface still using `useState` + `useEffect` + `fetch` instead of SWR. This means:
- No deduplication (navigating back triggers a full refetch)
- No stale-while-revalidate
- No cache key consistency with the server
- Different code pattern from Dashboard (maintenance burden)

Files: `components/journeys/JourneysOverviewContent.tsx`
Effort: Low (follow DashboardView pattern exactly)

**4.2 Remove `initialDataIncludesThumbnails` flag**

This prop flows through dashboard and journeys pages, controlling whether SWR refetches on mount. Since both pages now always pass `true`, this flag adds indirection for zero value. The actual SWR config should simply be `revalidateOnMount: false` when `fallbackData` is present.

Files: `app/dashboard/page.tsx`, `app/journeys/page.tsx`, `components/dashboard/DashboardView.tsx`, `components/journeys/JourneysOverviewContent.tsx`
Effort: Low

**4.3 Parallelize profile + projects in prefetch functions**

Both `prefetchDashboard` and `prefetchJourneysList` run three sequential queries: profile → workspaceProjects → thumbnails. The master plan Phase 2 calls for parallelizing profile + projects. This saves ~600ms per page load.

Pattern:
```typescript
const [profile, allWorkspaceProjects] = await Promise.all([
  prisma.profile.findUnique({ where: { id: userId }, select: { role: true } }),
  prisma.workspaceProject.findMany({ ... include: { members: { where: { userId }, select: { userId: true } } } }),
]);
const isAdmin = profile?.role === "admin";
const filtered = isAdmin ? allWorkspaceProjects : allWorkspaceProjects.filter(wp => wp.members.length > 0);
```

Files: `lib/prefetch/dashboard.ts`, `lib/prefetch/journeys.ts`
Effort: Low

**4.4 Pass initial auth state to AuthProvider, skip `/api/me`**

The server already knows the user. Pass `{ id, email, role }` from `app/layout.tsx` to `AuthProvider` and skip the client-side `/api/me` call when initial state is provided. This eliminates one full round trip on every page load.

Files: `app/layout.tsx`, `context/AuthContext.tsx`
Effort: Medium

### Tier 2: Remove Soon (Medium Impact, Low Risk)

**4.5 Remove `force-dynamic` from dashboard and journeys pages**

`force-dynamic` was added to prevent ISR prerender errors. However, since these pages call `cookies()` via `getAuthedUser()` → Supabase, Next.js already auto-opts out of static rendering. Removing `force-dynamic` lets Next.js apply request-level deduplication and opens the door to ISR/caching later.

If removing causes a build error, the fix is to ensure the prefetch functions handle the "no user" case gracefully (return null), which they already do.

Files: `app/dashboard/page.tsx`, `app/journeys/page.tsx`
Effort: Low (test with `npm run build`)

**4.6 Share query logic between prefetch and API routes**

`lib/prefetch/dashboard.ts` and `app/api/dashboard/route.ts` contain nearly identical query logic. Same for journeys. When one is updated, the other is often forgotten.

Refactor: have both the prefetch function and the API route call the same core query function, passing different options (e.g., "include Server-Timing" for API, "skip cache headers" for prefetch).

Files: `lib/prefetch/dashboard.ts`, `app/api/dashboard/route.ts`, `lib/prefetch/journeys.ts`, `app/api/journeys/route.ts`
Effort: Medium

**4.7 Remove RequireAuth from route layout**

`app/routes/[id]/layout.tsx` wraps children in `<RequireAuth>`, a client component that checks `useAuth()` and redirects if not logged in. But the layout is a server component that calls `prefetchWorkspaceData(id)`, which calls `getAuthedUser()` and returns null for unauthenticated users. The server-side auth check is sufficient — the client-side gate adds a flash of loading state and depends on the `/api/me` call completing.

Files: `app/routes/[id]/layout.tsx`
Effort: Low

### Tier 3: Avoid Adding (Complexity Not Justified at Current Scale)

- **In-memory TTL data cache** (master plan Phase 3.2): process-local, resets on restart, doesn't share across instances. Adds a cache invalidation layer for marginal benefit at current data size. Defer until co-location lands and RTT is no longer dominant.
- **Raw SQL consolidation** (master plan Phase 2.3): replacing Prisma queries with a single CTE-based raw query. Harder to maintain, marginal gain over parallelized Prisma. Only consider if Phase 2.1/2.2 parallelization is insufficient.
- **Virtual scrolling for journeys list**: `@tanstack/react-virtual` was added for generation galleries (appropriate at 100+ items). Journey cards number in single digits. Virtual scrolling there would add complexity for no visible benefit.

---

## 5. Prioritized Execution Sequence

Ordered by measurable impact, with explicit gates.

### Wave 1: Structural Cleanup (removes debt, no new abstractions)

| Step | Change | Files | Expected Impact | Gate |
|------|--------|-------|----------------|------|
| 1a | Convert JourneysOverviewContent to SWR | `JourneysOverviewContent.tsx` | Consistent caching, no refetch on return navigation | Verify: no `/api/journeys` call when `initialJourneys` is present |
| 1b | Remove `initialDataIncludesThumbnails` flag | 4 files | Simplify SWR config, remove dead conditional | Verify: `revalidateOnMount: false` when `fallbackData` exists |
| 1c | Parallelize profile + projects in prefetch | `lib/prefetch/dashboard.ts`, `lib/prefetch/journeys.ts` | Save ~600ms per page load (one fewer serial RTT) | Measure: Server-Timing before/after |
| 1d | Pass initial auth to AuthProvider | `app/layout.tsx`, `context/AuthContext.tsx` | Eliminate `/api/me` call (~600ms saved) | Verify: no `/api/me` request in Network tab after page load |

**Wave 1 gate:** Run the master plan's curl benchmark script for `/dashboard`, `/journeys`, `/journeys/[id]`. Record TTFB and total time. Compare against pre-wave baseline. Expected: 30-50% improvement from eliminating 1-2 serial round trips + duplicate fetch.

### Wave 2: Remove Conflicting Directives

| Step | Change | Files | Expected Impact | Gate |
|------|--------|-------|----------------|------|
| 2a | Remove `force-dynamic` | `app/dashboard/page.tsx`, `app/journeys/page.tsx` | Enable Next.js request deduplication and future ISR | Verify: `npm run build` succeeds, pages still render correctly |
| 2b | Remove RequireAuth from route layout | `app/routes/[id]/layout.tsx` | Remove redundant client auth gate | Verify: unauthenticated requests still redirect to login |
| 2c | Share query logic between prefetch and API | 4 files | Single source of truth, prevent drift | Verify: API responses match prefetch data shape |

**Wave 2 gate:** Re-run benchmark. Verify no regression from Wave 1 improvements.

### Wave 3: Infrastructure (Config-Level Changes)

| Step | Change | Where | Expected Impact | Gate |
|------|--------|-------|----------------|------|
| 3a | Switch DATABASE_URL to transaction pooler (port 6543) | Environment/secrets | Better connection reuse, lower per-query overhead | Verify: app functions normally, migrations still use DIRECT_URL |
| 3b | Make Prisma query logging opt-in | `lib/prisma.ts` | Reduce dev-mode I/O noise | Verify: `PRISMA_LOG=verbose` still enables logging |
| 3c | Co-locate compute in eu-west-1 (Vercel function region) | Vercel dashboard | ~600ms → ~5ms per DB round trip | Measure: curl TTFB from external client |

**Wave 3 gate:** Full benchmark. If co-location lands (3c), all pages should be sub-2s. This is the highest single-impact change in the entire plan.

### Wave 4: Future (Only If Metrics Demand)

- ISR with `revalidate = 30` (requires Wave 2a to land first, and auth model to be clarified for multi-user)
- Server-side TTL cache (only if co-location doesn't bring pages under target)
- Admin query pagination and SQL aggregation (only when data grows past current scale)
- Suspense streaming for route layout (only if route workspace pages remain slow after Waves 1-3)

---

## 6. Performance Budgets

Per-route budgets to enforce after each wave.

| Route | p50 TTFB | p95 TTFB | Post-SSR API calls | DB round trips (server) |
|-------|---------|---------|-------------------|------------------------|
| `/dashboard` | < 3s (pre-colocation) / < 500ms (post) | < 5s / < 1s | 0 (SWR uses fallback) | ≤ 2 |
| `/journeys` | < 3s / < 500ms | < 5s / < 1s | 0 | ≤ 2 |
| `/journeys/[id]` | < 2s / < 300ms | < 3s / < 500ms | 0 | ≤ 2 |
| `/routes/[id]/*` | < 3s / < 500ms | < 5s / < 1s | 0 (SWR uses prefetch) | ≤ 2 |

### Regression Rules

1. **No commit should increase DB round trips per page above the budget.**
2. **No commit should add a post-SSR API call that duplicates server-rendered data.**
3. **Every performance commit must include a before/after timing note** (even a curl TTFB comparison).
4. **Files in the churn hotspot list should not be modified for performance without referencing this audit.**

---

## 7. Root Pattern Diagnosis

The recurring pattern across the last 10 days:

> Multiple optimization tactics were applied simultaneously across multiple layers (auth, prefetch, SWR, SQL, caching directives) without a single-variable experiment protocol. Each change was reasonable in isolation, but without per-change measurement, it was impossible to tell which changes helped and which introduced new problems. This led to a cycle where the same files were repeatedly modified to "fix" issues caused by the combined effect of prior changes.

The three things that would have prevented this:

1. **A loading contract per surface** (defined before optimization, not after).
2. **One change at a time with measurement** (curl TTFB before/after, logged in commit).
3. **A shared query function** between prefetch and API routes (preventing the two copies from drifting).

The master plan ([PERFORMANCE_PLAN.md](PERFORMANCE_PLAN.md)) is directionally correct. Its Phase 1 and Phase 2 address the right bottlenecks. The execution sequence above (Waves 1-3) implements those phases while first removing the debt that accumulated from the last 10 days of uncoordinated optimization.
