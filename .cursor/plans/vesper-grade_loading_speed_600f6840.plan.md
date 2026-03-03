---
name: Vesper-grade loading speed
overview: "Port the highest-impact Vesper loading optimizations to Sigil: infinite scroll with cursor pagination, optimistic generation inserts, dynamic imports for heavy components, and virtual scrolling for large generation lists."
todos:
  - id: infinite-scroll
    content: Implement infinite scroll with useSWRInfinite for generations in ProjectWorkspace
    status: completed
  - id: payload-slimming
    content: Slim generations API payload to only fields needed by gallery/cards
    status: completed
  - id: db-index-audit
    content: Validate and add missing Prisma indexes for generations query patterns
    status: completed
  - id: skeleton-first-paint
    content: Add skeleton placeholders in ProjectWorkspace and ForgeGallery for faster perceived load
    status: completed
  - id: image-delivery-audit
    content: Standardize next/image usage in generation cards with correct sizes and lazy strategy
    status: completed
  - id: swr-revalidation-policy
    content: Tune SWR revalidation and deduping to reduce redundant network work
    status: completed
  - id: perf-baseline
    content: Add before/after measurements using Server-Timing and client vitals markers
    status: completed
  - id: optimistic-insert
    content: Add optimistic temp generation on submit for instant UI feedback
    status: completed
  - id: dynamic-imports
    content: Lazy-load BrainstormPanel, ConvertToVideoModal, CanvasWorkspace with next/dynamic
    status: completed
  - id: virtual-scroll
    content: Add @tanstack/react-virtual to ForgeGallery for 20+ generation lists
    status: completed
  - id: swr-workspace
    content: Replace manual fetch in ProjectWorkspace with SWR for sessions and models
    status: completed
  - id: server-prefetch
    content: Add server-side data prefetch in route image page (stretch goal)
    status: completed
isProject: false
---

# Vesper-Grade Loading Speed for Sigil

## Current State

Sigil has SWR on the dashboard and cursor-based pagination in the API, but the client loads all generations at once, re-fetches on every navigation, has no optimistic UI, and renders every component eagerly. Vesper went from 5-10s generation loads to under 1s with the patterns below.

## Priority Order (by user-perceived impact)

### 1. Infinite scroll for generations (biggest win)

Currently `[components/generation/ProjectWorkspace.tsx](components/generation/ProjectWorkspace.tsx)` fetches all generations in one call (up to 100). With 20+ generations this is the main bottleneck when opening a route.

- Fetch only 10 generations initially using the existing cursor API
- Add a "load more" trigger (intersection observer at bottom of gallery)
- Use SWR's `useSWRInfinite` to manage paginated cache
- Pass `nextCursor` from API response to fetch next page

### 1.5 API + query fast-path (quick backend win)

Before UI-level gains fully land, reduce backend and network overhead for each generations request:

- Slim `[app/api/generations/route.ts](app/api/generations/route.ts)` to return only fields used by gallery/cards
- Validate query shape and add missing indexes in `[prisma/schema.prisma](prisma/schema.prisma)` for `sessionId + createdAt` pagination path
- Keep response format stable for current client contracts while reducing payload size

### 2. Optimistic generation insert

When a user submits a prompt, there's a visible delay before the card appears (waits for refetch). Vesper inserts a temporary `temp-*` generation immediately.

- On submit, insert a temporary `GenerationItem` with `status: "processing"` into the local generations list
- When the real generation arrives via realtime or refetch, replace the temp item by matching `id`
- Gives instant visual feedback

### 3. Dynamic imports for heavy components

Several large components load eagerly even when not visible. Lazy-load them with `next/dynamic`:

- `BrainstormPanel` (only visible when toggled)
- `ConvertToVideoModal` (only visible on action)
- `CanvasWorkspace` (only in canvas mode)

### 4. Virtual scrolling for 20+ generations

When a session has many generations, rendering all DOM nodes is expensive. Add `@tanstack/react-virtual` for the generation gallery.

- Install `@tanstack/react-virtual`
- Wrap the generation list in `[components/generation/ForgeGallery.tsx](components/generation/ForgeGallery.tsx)` with a virtualizer
- Only render visible generation cards + small overscan buffer

### 4.5 Perceived-speed polish (instant feel)

Even when network is fast, users should see immediate structure:

- Add lightweight skeleton cards in `[components/generation/ProjectWorkspace.tsx](components/generation/ProjectWorkspace.tsx)` and `[components/generation/ForgeGallery.tsx](components/generation/ForgeGallery.tsx)` on initial load
- Ensure generation card images use consistent `next/image` settings (`sizes`, lazy loading, priority only for first visible item)

### 5. SWR for ProjectWorkspace data

ProjectWorkspace currently uses manual `useEffect` + `useState` for sessions, generations, and models. Replace with SWR hooks (matching what we did for the dashboard).

- `useSWR` for sessions, models (stable data, long staleTime)
- `useSWRInfinite` for generations (ties into infinite scroll above)
- Tune `revalidateOnFocus` and `dedupingInterval` for sessions/models to avoid redundant refetch when realtime updates are active
- Navigating away and back shows cached data instantly

### 6. Server-side prefetch for route pages (stretch)

Route pages are server components but don't prefetch. Add server-side data fetching so the first paint already has session/generation data.

- In `[app/routes/[id]/image/page.tsx](app/routes/[id]/image/page.tsx)`, fetch sessions + first generation page server-side
- Pass as `initialData` to SWR hooks via props (avoids HydrationBoundary complexity)

### 7. Measurement guardrail (verify wins)

Add lightweight instrumentation so we can validate improvements and prevent regressions:

- Track route open and first gallery render with client marks (web vitals/custom markers)
- Keep and compare `Server-Timing` for API routes before/after payload and query optimizations
- Record a simple benchmark pass (cold load, warm cache, 20+ generation session)

## Files changed

- `[components/generation/ProjectWorkspace.tsx](components/generation/ProjectWorkspace.tsx)` -- SWR hooks, infinite scroll, optimistic insert
- `[components/generation/ForgeGallery.tsx](components/generation/ForgeGallery.tsx)` -- virtual scrolling wrapper
- `[app/api/generations/route.ts](app/api/generations/route.ts)` -- payload slimming and pagination contract preservation
- `[prisma/schema.prisma](prisma/schema.prisma)` -- query-aligned index validation/additions
- `[package.json](package.json)` -- add `@tanstack/react-virtual`
- Dynamic import wrappers for BrainstormPanel, ConvertToVideoModal, CanvasWorkspace
- `[app/routes/[id]/image/page.tsx](app/routes/[id]/image/page.tsx)` -- server-side prefetch (stretch)

## Expected Results (based on Vesper measurements)

- Route open: 1-2s to under 500ms (load 10 instead of 100+)
- Generation submit: instant card appearance (optimistic)
- Large sessions: smooth scrolling at 200+ generations (virtual)
- Return navigation: instant (SWR cache hit)

