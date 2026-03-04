---
name: Instant delete everywhere
overview: Fix stale UI after journey delete by switching from full SWR re-fetch to optimistic local cache updates, and add the same rename/delete hover icons to route cards on the dashboard.
todos:
  - id: optimistic-dashboard
    content: Add optimistic SWR mutation helpers in DashboardView (onJourneyDeleted, onJourneyRenamed, onRouteDeleted, onRouteRenamed)
    status: completed
  - id: journey-panel-callbacks
    content: Update JourneyPanel to call optimistic delete/rename callbacks instead of generic onJourneyCreated
    status: completed
  - id: route-card-icons
    content: Add rename + delete hover icons to RouteCard, with dialogs in RouteCardsPanel
    status: completed
  - id: route-panel-callbacks
    content: Wire RouteCardsPanel rename/delete to optimistic DashboardView callbacks
    status: completed
isProject: false
---

# Instant Delete and Rename/Delete Icons for All Dashboard Cards

## Problem

After deleting a journey in [JourneyPanel.tsx](components/dashboard/JourneyPanel.tsx), the card stays visible until a full page refresh. The root cause: `handleDelete` calls `onJourneyCreated?.()` which maps to `() => void mutate()` in [DashboardView.tsx](components/dashboard/DashboardView.tsx) (line 179). This triggers a full network re-fetch of `/api/dashboard` instead of instantly removing the item from the local SWR cache.

The working pattern already exists in [JourneysOverviewContent.tsx](components/journeys/JourneysOverviewContent.tsx) (lines 183-187) — it filters the deleted journey out of the cache locally:

```184:187:components/journeys/JourneysOverviewContent.tsx
      await mutate(
        (current) => current ? { journeys: current.journeys.filter((j) => j.id !== deleteTarget.id) } : current,
        { revalidate: false },
      );
```

## Changes

### 1. DashboardView — optimistic mutation callbacks

In [DashboardView.tsx](components/dashboard/DashboardView.tsx), replace the generic `onJourneyCreated={() => void mutate()}` with specific optimistic callbacks passed down to child panels:

- `**onJourneyDeleted(id)**` — filters the deleted journey out of `data.journeys`, resets `selectedJourneyId` if it was the deleted one
- `**onJourneyRenamed(id, name)**` — maps over `data.journeys` and patches the name in-place
- `**onRouteDeleted(routeId)**` — filters the deleted route out of the selected journey's routes
- `**onRouteRenamed(routeId, name)**` — patches the route name inside the selected journey

All use `mutate(updater, { revalidate: false })` for instant UI updates with no network roundtrip.

### 2. JourneyPanel — use optimistic callbacks

In [JourneyPanel.tsx](components/dashboard/JourneyPanel.tsx):

- `handleDelete`: call `onJourneyDeleted?.(deleteId)` instead of `onJourneyCreated?.()`
- `handleRename`: call `onJourneyRenamed?.(renameId, renameName)` instead of `onJourneyCreated?.()`
- Update the `JourneyPanelProps` type to add these two new callbacks (keep `onJourneyCreated` for the create flow, which still needs a full re-fetch since the server generates the ID)

### 3. RouteCardsPanel + RouteCard — add rename/delete hover icons

In [RouteCard.tsx](components/dashboard/RouteCard.tsx):

- Add the same pencil + trash hover icon pattern from JourneyPanel
- Icons appear in the top-right of the data panel area on hover
- Pass `onRename` and `onDelete` callbacks up to RouteCardsPanel

In [RouteCardsPanel.tsx](components/dashboard/RouteCardsPanel.tsx):

- Add rename dialog (input + save), calling `PATCH /api/projects/:id`
- Add delete confirmation dialog, calling `DELETE /api/projects/:id`
- On success, call the optimistic `onRouteDeleted` / `onRouteRenamed` callbacks from DashboardView
- Handle `focusedRouteId` reset when the focused route is deleted

### 4. API endpoints (no changes needed)

Both already exist and are fully functional:

- `PATCH /api/projects/[id]` — rename route ([app/api/projects/[id]/route.ts](app/api/projects/[id]/route.ts) line 15)
- `DELETE /api/projects/[id]` — delete route ([app/api/projects/[id]/route.ts](app/api/projects/[id]/route.ts) line 43)

