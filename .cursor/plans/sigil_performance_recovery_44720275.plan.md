---
name: sigil performance recovery
overview: Deliver scalable Next.js App Router performance by removing duplicate work, enforcing cache discipline, slimming API payloads, and meeting strict p95 targets for dashboard, journey, and route-open flows.
todos:
  - id: baseline-and-slos
    content: Capture production baseline and lock p95 SLOs for dashboard, journey, and route-open.
    status: completed
  - id: remove-auth-duplication
    content: Eliminate duplicate auth checks and make /api/me read-only on the hot path.
    status: completed
  - id: unify-route-bootstrap
    content: Ensure route data is fetched once per navigation and prevent immediate duplicate client refetch.
    status: completed
  - id: stop-expensive-prefetch
    content: Disable automatic prefetch on expensive route/mode paths until payloads are cheap.
    status: completed
  - id: slim-hot-apis
    content: Refactor dashboard/journey/session/generation endpoints for batched queries, pagination, and first-paint payloads only.
    status: completed
  - id: video-iterations-rework
    content: Replace per-output polling and JSON post-filtering with indexed linkage and batched status fetch.
    status: completed
  - id: cache-policy-hardening
    content: Remove blanket no-store usage and standardize private cache/revalidate strategy for read APIs.
    status: completed
  - id: loading-boundaries
    content: Add route-level loading boundaries for progressive rendering on slow backend responses.
    status: completed
  - id: isolate-generation-runtime
    content: Decouple long-running generation processing from request lifecycle for scalability under load.
    status: completed
  - id: verify-and-lock-regressions
    content: Validate request count, payload, and p95 improvements; add guardrails to prevent regressions.
    status: completed
isProject: false
---

# Sigil Performance Recovery Plan (Lean)

## Best-Practice Rules (Non-negotiable)

- Keep middleware lightweight; avoid duplicate auth checks.
- Use `no-store` only where strictly required.
- Do not fetch the same route data twice on open.
- Return first-paint payloads only; paginate large datasets.
- Every change must improve request count, payload size, or p95 latency.

## SLOs

- Dashboard p95 data-ready: **< 4s**
- Journey detail p95 data-ready: **< 3s**
- Route-open to first gallery render p95: **< 2.5s**
- Route-open request count: **at least 40% lower** than baseline

## Execution Order

### 1) Baseline and SLO Lock

- Add and verify timing marks for dashboard/journey/route-open.
- Use existing `Server-Timing` headers and standardize request correlation.

### 2) Remove Auth Duplication

- Simplify auth flow across:
  - `[middleware.ts](middleware.ts)`
  - `[lib/auth/server.ts](lib/auth/server.ts)`
  - `[context/AuthContext.tsx](context/AuthContext.tsx)`
  - `[app/api/me/route.ts](app/api/me/route.ts)`
- Make `/api/me` read-only in hot path (no write-on-read profile upsert).

### 3) Single Route Bootstrap

- Consolidate route bootstrap for image/video/canvas in:
  - `[app/routes/[id]/image/page.tsx](app/routes/[id]/image/page.tsx)`
  - `[app/routes/[id]/video/page.tsx](app/routes/[id]/video/page.tsx)`
  - `[app/routes/[id]/canvas/page.tsx](app/routes/[id]/canvas/page.tsx)`
  - `[lib/prefetch/workspace.ts](lib/prefetch/workspace.ts)`
- Prevent immediate duplicate client refetch in:
  - `[components/generation/ProjectWorkspace.tsx](components/generation/ProjectWorkspace.tsx)`

### 4) Stop Expensive Prefetch

- Disable auto prefetch for expensive route/mode transitions in:
  - `[components/dashboard/RouteCardsPanel.tsx](components/dashboard/RouteCardsPanel.tsx)`
  - `[components/generation/ForgePromptBar.tsx](components/generation/ForgePromptBar.tsx)`
  - `[components/journeys/RouteCard.tsx](components/journeys/RouteCard.tsx)`

### 5) Slim Hot APIs

- Refactor batched queries and trim payloads in:
  - `[app/api/dashboard/route.ts](app/api/dashboard/route.ts)`
  - `[app/api/journeys/route.ts](app/api/journeys/route.ts)`
  - `[app/api/journeys/[id]/route.ts](app/api/journeys/[id]/route.ts)`
  - `[app/api/sessions/route.ts](app/api/sessions/route.ts)`
  - `[app/api/generations/route.ts](app/api/generations/route.ts)`

### 6) Video Iterations Rework

- Replace per-output polling and JSON post-filtering in:
  - `[hooks/useVideoIterations.ts](hooks/useVideoIterations.ts)`
  - `[app/api/outputs/[id]/video-iterations/route.ts](app/api/outputs/[id]/video-iterations/route.ts)`
  - `[components/generation/VideoIterationsStackHint.tsx](components/generation/VideoIterationsStackHint.tsx)`
- Move to indexed linkage + batched status fetch.

### 7) Cache Policy Hardening

- Remove blanket read-path `no-store` and align with private cache/revalidate policy in:
  - `[components/generation/ProjectWorkspace.tsx](components/generation/ProjectWorkspace.tsx)`
  - `[app/journeys/page.tsx](app/journeys/page.tsx)`
  - `[app/journeys/[id]/page.tsx](app/journeys/[id]/page.tsx)`
  - `[lib/api/cache-headers.ts](lib/api/cache-headers.ts)`

### 8) Progressive Rendering Boundaries

- Add `loading.tsx` boundaries for critical routes:
  - `app/dashboard/loading.tsx`
  - `app/journeys/loading.tsx`
  - `app/journeys/[id]/loading.tsx`
  - `app/routes/[id]/loading.tsx`

### 9) Isolate Long-Running Processing

- Decouple generation processing from request lifecycle in:
  - `[app/api/generate/route.ts](app/api/generate/route.ts)`
  - `[app/api/generate/process/route.ts](app/api/generate/process/route.ts)`
  - `[lib/models/processor.ts](lib/models/processor.ts)`

## Definition of Done

- All SLOs met for three critical flows.
- Route-open request count and payload size materially reduced.
- No duplicate auth/data fetch path remains on hot navigation.
- Caching strategy is explicit and consistent for authenticated reads.

