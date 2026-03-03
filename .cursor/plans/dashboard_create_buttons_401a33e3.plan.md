---
name: Dashboard create buttons
overview: Add subtle inline create buttons to the Journey and Route panel headers on the dashboard, with dialog-based creation forms. Journeys are admin-only; routes are available to any journey member.
todos:
  - id: journey-create
    content: Add admin-only + button and Dialog to JourneyPanel for creating journeys
    status: completed
  - id: route-create
    content: Add + button and Dialog to RoutePanel for creating routes within selected journey
    status: completed
  - id: wire-refresh
    content: Wire SWR mutate callbacks in DashboardView to refresh after creation
    status: completed
isProject: false
---

# Dashboard Create Buttons (Journeys + Routes)

## Design

Add a small `+` button inline with the `SectionHeader` in each panel. Clicking it opens the existing `Dialog` component with a name/description form. The button uses the established `sigil-btn-secondary` pattern, scaled down to fit the header without disrupting the layout.

- **Journey panel header**: `01 JOURNEYS` ... `[+]` -- admin only
- **Route panel header**: `02 ROUTES` ... `[+]` -- any authenticated user (assigned to journey)

## Changes

### 1. Update `SectionHeader` to accept an optional action slot

In both `[components/dashboard/JourneyPanel.tsx](components/dashboard/JourneyPanel.tsx)` and `[components/dashboard/RoutePanel.tsx](components/dashboard/RoutePanel.tsx)`, the local `SectionHeader` function currently renders a static heading. Add an optional `action` prop (ReactNode) that renders flush-right in the header row.

### 2. Add journey creation to `JourneyPanel`

- Show `+` button only when `isAdmin` is true
- On click, open `Dialog` with title "create new journey", name field (required), optional description
- On submit, POST to `/api/admin/workspace-projects` with `{ name, description }`
- On success, call a new `onJourneyCreated` callback prop so `DashboardView` can refresh data via SWR `mutate()`

### 3. Add route creation to `RoutePanel`

- Show `+` button when a journey is selected (`selectedJourneyId` is non-null)
- On click, open `Dialog` with title "create new route", name field, optional description
- On submit, POST to `/api/projects` with `{ name, description, workspaceProjectId: selectedJourneyId }`
- On success, call a new `onRouteCreated` callback prop so `DashboardView` can refresh

### 4. Wire callbacks in `DashboardView`

- In `[components/dashboard/DashboardView.tsx](components/dashboard/DashboardView.tsx)`, pass `onJourneyCreated` and `onRouteCreated` callbacks that call SWR's `mutate()` to refresh the dashboard data
- Pass `selectedJourneyId` to `RoutePanel` so it knows which journey to attach new routes to

## Files changed

- `[components/dashboard/JourneyPanel.tsx](components/dashboard/JourneyPanel.tsx)` -- add `+` button (admin-only), Dialog, POST handler, `onJourneyCreated` callback
- `[components/dashboard/RoutePanel.tsx](components/dashboard/RoutePanel.tsx)` -- add `+` button, Dialog, POST handler, `onRouteCreated` callback, accept `journeyId` prop
- `[components/dashboard/DashboardView.tsx](components/dashboard/DashboardView.tsx)` -- wire `mutate()` refresh callbacks and pass `selectedJourneyId` to RoutePanel

