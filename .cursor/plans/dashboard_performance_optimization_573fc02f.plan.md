---
name: Dashboard performance optimization
overview: Speed up the dashboard load and image rendering by parallelizing DB queries, adding cache headers, enabling SWR client-side caching, and switching to Next.js Image optimization for Supabase storage URLs.
todos:
  - id: parallelize-api
    content: Parallelize dashboard API queries and remove unused gallery query
    status: completed
  - id: cache-headers
    content: Add short cache headers to dashboard API response
    status: completed
  - id: swr-client
    content: Install SWR and replace manual fetch in DashboardView with useSWR hook
    status: completed
  - id: next-image-config
    content: Add Supabase remote pattern to next.config.ts
    status: completed
  - id: next-image-component
    content: Migrate ImageDiskStack from raw img to next/image
    status: completed
  - id: optimize-thumbnails
    content: Replace bulk thumbnail query with per-route limited queries via Promise.all
    status: completed
  - id: add-db-indexes
    content: Add/verify Prisma indexes for dashboard query paths (outputs, generations, sessions, memberships)
    status: completed
  - id: slim-payload
    content: Reduce dashboard payload to first-paint fields and defer heavy metadata to secondary fetches
    status: completed
  - id: media-cache-policy
    content: Increase cache TTL for immutable Supabase media and ensure proper cache headers on read APIs
    status: completed
  - id: prefetch-hot-paths
    content: Prefetch likely next route/session data after journey selection
    status: completed
  - id: add-observability
    content: Add API/query timing logs to identify remaining production bottlenecks
    status: completed
isProject: false
---

# Dashboard & Image Loading Performance Optimization

## Problem

The dashboard API at `[app/api/dashboard/route.ts](app/api/dashboard/route.ts)` runs 7-8 sequential Prisma queries with no caching. The client in `[components/dashboard/DashboardView.tsx](components/dashboard/DashboardView.tsx)` fetches with `cache: "no-store"` every mount. Images use raw `<img>` tags with no optimization.

## Changes

### Priority for workshop

Implement these first to get immediate perceived speed improvements:

1. Parallelize dashboard API + remove gallery query
2. Add dashboard cache headers + SWR client caching
3. Optimize thumbnail query and image rendering path

### 1. Parallelize dashboard API queries

Currently all queries in `app/api/dashboard/route.ts` run sequentially. After the initial auth + profile lookup, the remaining queries (accessible projects, gallery, workspace projects, route thumbnails, admin stats) can be grouped into parallel batches using `Promise.all`.

**Before:** ~7 sequential queries
**After:** 3 sequential steps (auth, then 2 parallel batches)

### 2. Remove the unused gallery query

`DashboardView.tsx` line 56 discards the `gallery` field immediately:

```typescript
const { gallery: _g, ...rest } = json;
```

The gallery query (30 items with nested joins) runs for nothing. Remove it from the API.

### 3. Add cache headers to the dashboard API

The app already has a cache utility at `[lib/api/cache-headers.ts](lib/api/cache-headers.ts)` with a `"short"` profile (`s-maxage=10, stale-while-revalidate=5`). Apply it to the dashboard response so Vercel's CDN can serve stale data while revalidating.

### 4. Add SWR for client-side data caching

Install `swr` and wrap the dashboard fetch so navigating away and back doesn't trigger a full reload. SWR will show stale data instantly and revalidate in the background.

- Install: `npm install swr`
- Create a small `useDashboard()` hook using `useSWR("/api/dashboard", fetcher)`
- Replace the manual `useEffect` + `useState` fetch in `DashboardView.tsx`

### 5. Configure Next.js Image optimization for Supabase

Add Supabase storage domain to `[next.config.ts](next.config.ts)`:

```typescript
images: {
  remotePatterns: [
    {
      protocol: "https",
      hostname: "hrgxfbyrumeyftqrlehv.supabase.co",
      pathname: "/storage/v1/object/public/**",
    },
  ],
}
```

Then migrate `<img>` to `<Image>` in `[components/journeys/ImageDiskStack.tsx](components/journeys/ImageDiskStack.tsx)` (the main image display component). This gives automatic WebP/AVIF conversion, responsive sizing, and blur placeholders.

### 6. Optimize the thumbnail query

The current route thumbnails query fetches **all outputs** for all briefings and filters to 8 per project in JavaScript. Replace with a SQL-level `LIMIT` per project using Prisma's `take` inside a per-briefing loop via `Promise.all`, capping at 8 per route.

### 7. Add/verify database indexes for hot paths

The dashboard endpoints and route views rely on joins and sorts across outputs, generations, sessions, projects, and memberships. Add or confirm indexes in `[prisma/schema.prisma](prisma/schema.prisma)` and deploy migration for:

- `Output(generationId, createdAt)`
- `Generation(sessionId, createdAt)`
- `Session(projectId, createdAt)`
- membership lookup paths used by dashboard access filtering

### 8. Slim first-paint payload

Return only fields needed for immediate render in dashboard list views, and defer heavy/secondary metadata (extended counts and ancillary data) into follow-up requests.

### 9. Improve media caching policy

For immutable image/video objects in Supabase storage, increase cache lifetime beyond the current 1 hour upload setting, while keeping API JSON revalidation short (`short`/`stable` profiles) to balance freshness and speed.

### 10. Prefetch likely-next data

After journey selection, prefetch likely next route/session payloads so opening a route feels instant.

### 11. Add timing observability

Add lightweight server timing for dashboard and route APIs (total duration + key query durations) to identify remaining slow points in production and guide follow-up tuning.

## Files changed

- `[app/api/dashboard/route.ts](app/api/dashboard/route.ts)` -- parallelize queries, remove gallery, add cache headers, optimize thumbnail fetch
- `[components/dashboard/DashboardView.tsx](components/dashboard/DashboardView.tsx)` -- replace manual fetch with SWR hook
- `[next.config.ts](next.config.ts)` -- add Supabase image domain
- `[components/journeys/ImageDiskStack.tsx](components/journeys/ImageDiskStack.tsx)` -- migrate to `next/image`
- `[package.json](package.json)` -- add `swr` dependency
- `[prisma/schema.prisma](prisma/schema.prisma)` -- add/verify supporting indexes for dashboard and route query paths

