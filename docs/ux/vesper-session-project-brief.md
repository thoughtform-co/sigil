# Vesper Session & Project UX Brief (Sigil)

Source-of-truth for project/session workspace layout, interaction model, and Thoughtform grammar mapping. Adapted from Vesper; implemented in Sigil with Sigil token styling.

---

## 1. IA and flow

**Lifecycle:** Project → Session → Generation → Output

- **Project**: Top-level container. User creates from dashboard; opening a project loads the workspace.
- **Session**: Scoped to a project. Has type (`image` | `video`). User creates/switches/renames/deletes sessions within the workspace.
- **Generation**: One submission (prompt + model + params) within a session. Produces one or more outputs.
- **Output**: Single image or video artifact. User can approve, delete, reuse params, or (for images) convert to video.

**State transitions:**

- Create project → redirect to workspace (project has one initial session).
- Create session → new session of chosen type; optionally switch to it; last-active-per-type remembered when toggling image/video.
- Switch session → gallery and prompt context follow selected session; model set filtered by session type.
- Generate → submit to API; optimistically or via realtime show new generation; prompt cleared on success.
- Retry/reuse/dismiss → output-level actions; reuse populates prompt bar; retry re-submits; dismiss hides stuck/failed from list.

---

## 2. Layout zones

| Zone | Description | Ownership |
|------|-------------|-----------|
| **Left session rail** | Project name, rename, session list (+ image / + video), session cards. Filtered by generation type when image/video toggle exists. | Fixed or sticky left column; width ~260px. |
| **Center gallery** | Scrollable list/grid of generations for active session. Empty state when none. | Flex-grow; content-driven width; no arbitrary max-width. |
| **Bottom prompt dock** | Model, params, prompt input, reference image, generate/enhance actions. | Sticky bottom of main column; gold top border; surface-1. |
| **Optional right assistant** | Brainstorm panel. Can push prompt into generation input. | Desktop: docked right panel (toggleable). Mobile: floating overlay. |

**Positioning rules:**

- One primary nav layer per context (e.g. global nav vs workspace-only header).
- Capped fixed elements; explicit z-index hierarchy so nav, rail, dock, modals do not collide.
- Gallery width content-driven; avoid mixing multiple max-width systems.

---

## 3. Image/video mode switching

- **Generation type** is `image` | `video` at workspace level.
- Session rail shows only sessions matching current type (or all if no toggle).
- **Last-active-session per type** stored in a ref (or state); when user switches type back, restore that session.
- Model set and param controls (e.g. duration) follow session type; switching type switches compatible models deterministically.

---

## 4. Output-level interactions

Per generation card:

- **Status**: processing | complete | failed | dismissed. Badges/indicators use Data Readouts style (mono, 9px).
- **Actions**: Reuse parameters (fills prompt bar), Rerun/retry (re-submit), Convert to video (create/switch to video session with image as reference), Dismiss (hide from list for stuck/failed).
- **Per-output**: Approve, Delete. Shown on each image/video in the card.
- Action affordance positioning: consistent placement (e.g. bottom-right of card, or under media) so users can scan quickly.

---

## 5. Brainstorm assistant flow

- Assistant (right panel or floating) can **push prompt** into the generation input via callback (`onSendPrompt` → `externalPrompt` state in workspace).
- Workspace consumes `externalPrompt` once (e.g. set prompt, clear ref) so the same suggestion does not re-apply.
- Desktop: docked right panel, optional toggle. Mobile: floating overlay so it does not block gallery/prompt.

---

## 6. Interaction states

- **Sessions**: create, switch, rename, delete. Loading/empty/error for list.
- **Generations**: submit, retry, reuse, dismiss. Loading/empty/error for gallery; processing indicators.
- **Project**: rename; load name for rail.

---

## 7. Responsive behavior

- **Desktop (e.g. ≥1024px)**: Three zones — session rail, gallery + prompt dock, optional right assistant. Stable container widths; rail and dock deterministic.
- **Tablet (e.g. 768–1023px)**: Two zones — collapse or hide side panels; gallery + prompt dock primary; assistant as overlay if needed.
- **Mobile**: Stacked layout or bottom-sheet for prompt; session switcher compact; assistant floating.

---

## 8. Realtime guidance

- Prefer **Supabase realtime** subscriptions for generation status updates instead of 5s polling.
- **Optimistic UI**: new generation can appear with temp ID; replace with real ID when server confirms.
- Fallback: on reconnect or load, refetch generations for active session so list stays correct.

---

## 9. Navigation Grammar zone mapping

| Primitive | Usage in workspace |
|-----------|---------------------|
| **Viewport Frame** | Corner brackets; outer workspace shell (four corners of project view). |
| **Heading Indicator** | Gold left-border or underline — active session in rail; active generation type if toggle present. |
| **Data Readouts** | Mono, uppercase, 9px — session metadata (name, type), generation status badges, model/param display. |
| **Course Lines** | 1px `var(--dawn-08)` borders — between session rail and gallery, gallery and prompt dock, internal dock dividers. |
| **Depth Layers** | void (gallery bg), surface-0 (rail, dock), surface-1 (brainstorm, dropdowns), surface-2 (modals). |
| **Signal Strength** | dawn opacity scale — primary text (dawn), secondary (dawn-70), metadata (dawn-30), borders (dawn-08). |
| **Waypoints** | Gold diamonds — active session indicator, new-items scroll indicator, status dots. |
| **Bearing Labels** | 01, 02, 03 — session order in rail; generation sequence if needed. |
| **Telemetry Rails** | Optional tick marks along session rail for orientation. |
| **Compass Anchor** | Empty state: centered diamond or brandmark when no generations. |

---

## 10. Component Technology Boundary

**Use freely:**

- shadcn/ui primitives (Dialog, Button, Select, Textarea) as structure only.
- Tailwind for layout, spacing, flexbox, grid, breakpoints.
- Sigil `.sigil-*` classes (e.g. `.sigil-btn-primary`, `.sigil-input`, `.sigil-textarea`, `.sigil-select`).
- Thoughtform CSS variables: `--gold`, `--dawn-*`, `--surface-*`, `--void`, `--font-mono`.

**Never port from Vesper:**

- `border-radius` / `rounded-*` — Sigil uses `border-radius: 0`; use corner brackets or chamfers.
- `backdrop-blur-*` — Sigil uses opaque surfaces (depth layers), not frosted glass.
- Generic shadcn tokens (`bg-background`, `text-muted-foreground`, `bg-card/95`) — use `var(--void)`, `var(--dawn-70)`, `var(--surface-0)`.
- `rounded-full` pills — use diamonds (45deg rotated squares) per Thoughtform shape law.
- `animate-bounce` / spring motion — use 80–150ms transitions with `var(--ease-out)`.

**Rule of thumb:** Vesper `rounded-2xl backdrop-blur-xl bg-card/95` → Sigil `border border-[var(--dawn-08)] bg-[var(--surface-0)]` with optional corner brackets.

---

## 11. QA checklist (handoff)

Validate `/projects` and `/projects/[id]` at desktop (≥1024px), tablet (768–1023px), and mobile (<768px).

### States and flows

- [ ] **Empty/loading/error** — Projects list, session rail, and gallery show appropriate empty/loading/error states.
- [ ] **Session create/switch/rename/delete** — Selection and model set stay correct; no orphaned UI.
- [ ] **Image/video mode** — Toggle filters session rail by type and restores last-active session per type.
- [ ] **Output actions** — Reuse params, retry (failed), rerun (any), convert to video (image output), dismiss; approve/delete per output.
- [ ] **Brainstorm → prompt** — “Use as prompt” on assistant messages and “send to prompt” for draft; desktop docked panel, mobile floating overlay; close panel works.
- [ ] **Realtime** — Generation status updates without visible 5s polling (fallback poll at 10s when processing).

### Layout and tokens

- [ ] **Responsive** — Desktop: three zones (rail, gallery + dock, optional right panel). Tablet/mobile: two-zone or stacked; brainstorm overlay on narrow.
- [ ] **Tokens only** — No hardcoded colors; all zones use `var(--*)` and `.sigil-*` / HUD classes.
- [ ] **Z-index** — No overlap collisions; fixed elements use `--z-*` hierarchy (see globals.css).

### Screens to capture for handoff

- `/projects` — empty state, list with cards.
- `/projects/[id]` — empty sessions (rail “No sessions yet”), with image session, with video session.
- Mode switch (image ↔ video) with session list and last-active restore.
- Gallery — processing badge, failed + retry, reuse/rerun/convert/dismiss, approve/delete.
- Brainstorm panel open (docked), “use as prompt” / “send to prompt”, panel closed.
- Mobile: brainstorm floating overlay and close.
