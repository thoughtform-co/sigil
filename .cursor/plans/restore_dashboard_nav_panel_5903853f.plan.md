---
name: Restore dashboard nav panel
overview: Restore the original left sidebar nav panel for dashboard pages (projects, briefings, analytics, admin) while keeping the new minimal rail-aligned nav for workspace pages. Also verify password login works on localhost.
todos:
  - id: restore-nav-panel
    content: "Restore showNavPanel dual-mode in NavigationFrame: left sidebar for dashboard, rail-aligned for workspace"
    status: completed
  - id: update-nav-items
    content: Update sidebar nav items to current set (projects, briefings, analytics, bookmarks, settings)
    status: completed
isProject: false
---

# Restore Dashboard Nav Panel

## Problem

The `NavigationFrame` previously had two modes:

- **Dashboard** (`showNavPanel=true`): Gold "SIGIL" title bar + vertical left sidebar nav with links, theme toggle at bottom, content pushed right via `hud-shell--with-panel`
- **Workspace** (`showNavPanel=false`): Minimal header, full-width content via `hud-shell--workspace`

Our recent nav redesign replaced both modes with a single rail-aligned layout (text links top-left, particle icons top-right). This broke the dashboard pages which relied on the sidebar panel.

## Fix

Restore the dual-mode behavior in `[components/hud/NavigationFrame.tsx](components/hud/NavigationFrame.tsx)`:

- **When `showNavPanel=true`** (dashboard pages like `/projects`, `/briefings`, `/analytics`, `/admin`): render the original left sidebar nav panel with the gold SIGIL title bar, vertical nav links (projects, briefings, analytics, bookmarks, settings), theme toggle at bottom, and use `hud-shell--with-panel` for the main content. Update the nav items list to match current set (replace `dashboard`/`review` with `analytics`).
- **When `showNavPanel=false`** (workspace pages like `/projects/[id]/image`): keep the current rail-aligned layout -- text links top-left, particle icons top-right, `hud-shell--workspace` for main content.

Both modes share the same tick rails and HUD corners (no change needed there).

## Password login on localhost

The login page already supports password in dev mode. Verify it works by checking:

- The `IS_DEV` constant uses `process.env.NODE_ENV === "development"` -- this is a build-time constant in Next.js, so for local `npm run dev` it will be `true` and the password field will render.
- `signInWithPassword` is called when password is filled in.
- No allowlist check is needed for password login (it's dev-only).

No code changes needed for the login -- it should already work. If the user is having trouble logging in, it may be a Supabase-side issue (e.g. email not confirmed, password not set correctly).