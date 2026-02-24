---
name: Retro-futuristic card redesign
overview: Redesign ForgeGenerationCard to remove all boxed frames, replacing the left panel with open-flow typography (inspired by the x-ray HUD screenshot), the media frame with corner-only brackets (reusing HUD corner pattern), and adding a subtle dot grid background layer behind the workspace.
todos:
  - id: prompt-panel-open-typography
    content: Restyle .promptPanel, .promptBlock, .metaReadouts, .promptActions to remove all borders/backgrounds; create hierarchy through typography, color, and spacing only
    status: completed
  - id: media-corner-brackets
    content: Remove full border from .outputCard/.card; add corner-only L-shaped bracket marks on .mediaFrame using pseudo-elements
    status: completed
  - id: dot-grid-background
    content: Add subtle dot-grid pattern to globals.css and apply behind the workspace in NavigationFrame
    status: completed
  - id: card-container-cleanup
    content: Make .card container transparent, convert existing corner pseudo-elements to visible bracket marks
    status: completed
isProject: false
---

# Retro-Futuristic Card and Background Redesign

Three visual changes to the generation card and workspace, inspired by the reference screenshots.

---

## 1. Left Prompt Panel -- Open Typography Layout

**Current:** Three framed boxes stacked vertically -- `.promptBlock` (bordered), `.metaReadouts` (bordered, void bg), `.promptActions` (border-top separator). All inside a gradient-background panel with `border-right`.

**Target:** Remove all explicit borders and box backgrounds. Text elements float freely with hierarchy created purely through font size, color weight, and spacing -- like the x-ray HUD (screenshot 3) where readouts are scattered around the figure.

Changes to [ForgeGenerationCard.module.css](components/generation/ForgeGenerationCard.module.css):

- `**.promptPanel`**: Remove `border-right`, remove gradient background, keep `padding` and flex layout, set `background: transparent`
- `**.promptBlock`**: Remove `border`, remove `background`, keep as clickable region but visually invisible. Prompt text becomes the dominant element, sized up slightly (`13px`), color `--dawn-70`
- `**.metaReadouts**`: Remove `border`, remove `background: var(--void)`, remove `padding`. Readouts become free-floating mono text at `--dawn-30` with wider letter-spacing
- `**.promptActions**`: Remove `border-top`, keep `margin-top: auto` for bottom-anchoring. Actions in `--dawn-40`, gold on hover
- `**.copiedBadge**`: Keep as-is (gold border badge is a nice accent)
- Add a subtle vertical gold tick mark (2px wide, ~20px tall) at the top-left of the panel as an anchor point, using a `::before` pseudo-element on `.promptPanel`

Changes to [ForgeGenerationCard.tsx](components/generation/ForgeGenerationCard.tsx):

- Restructure the readout labels: split label from value so we can color them differently (label in `--dawn-30`, value in `--dawn-50`), similar to the "STAT: OPEN" / "CP: 40" patterns in the reference
- Add a small generation index/ID readout (truncated hash) for that technical-display feel

## 2. Media Frame -- Corner-Only Brackets

**Current:** `.outputCard` has `border: 1px solid var(--dawn-08)` (full rectangle). `.mediaFrame` is a nested div with `background: #000`.

**Target:** Remove full border from `.outputCard`. Add four corner bracket marks (L-shaped, ~16px) using pseudo-elements, matching the existing `hud-corner` pattern in [globals.css](app/globals.css) (lines 175-266).

Changes to [ForgeGenerationCard.module.css](components/generation/ForgeGenerationCard.module.css):

- `**.outputCard`**: Remove `border`. Set `position: relative` (already set)
- `**.mediaFrame`**: Add four corner brackets via two extra wrapper divs or via CSS `::before`/`::after` on `.mediaFrame` plus an extra element. Since CSS only gives us 2 pseudo-elements per element, we use a dedicated `.cornerBrackets` overlay div with 4 positioned children (or use `outline` + `clip-path` trick). Simplest: add a `.cornerMarks` div with `::before` and `::after`, plus the parent `.mediaFrame`'s own `::before`/`::after` to cover all 4 corners.

Corner bracket spec:

- Width/height: `16px` arm length, `1px` thickness
- Color: `var(--dawn-15)` default, `var(--gold-30)` on card hover
- Positioned at the 4 corners of `.mediaFrame`, inset by 0

## 3. Subtle Dot Grid Background

**Current:** No grid/dot pattern in the codebase.

**Target:** A fine dot matrix behind the entire workspace, inspired by screenshot 4 (anatomy wireframe). Dots at regular intervals, very low opacity, sitting behind the HUD rails.

Changes to [app/globals.css](app/globals.css):

- Add a `.dot-grid-bg` utility class using `background-image: radial-gradient(...)` with `background-size` for spacing
- Dot spec: `1px` radius circles, color `var(--dawn-08)`, spaced every `24px` on both axes
- Apply via a `::before` pseudo on `body` or on the `main.hud-shell` element in [NavigationFrame.tsx](components/hud/NavigationFrame.tsx)
- `z-index: -1` so it sits behind all content including HUD rails
- Respects both dark and light mode tokens (uses `--dawn-08` which adapts)

## 4. Card Container

- `**.card`**: Remove `border: 1px solid var(--dawn-08)` and `background: var(--surface-0)`. The card becomes transparent, with content floating on the dot-grid background. Keep the existing corner pseudo-elements (`::before`/`::after`) but re-style them as larger corner brackets (`20px` arms) in `--dawn-08`, visible by default (not just on hover)
- Remove `overflow: hidden` so corner marks can extend slightly if needed

---

## Files Modified


| File                                                   | Change                                          |
| ------------------------------------------------------ | ----------------------------------------------- |
| `components/generation/ForgeGenerationCard.module.css` | Remove frames, open typography, corner brackets |
| `components/generation/ForgeGenerationCard.tsx`        | Minor restructure of readout markup             |
| `app/globals.css`                                      | Add dot-grid background utility                 |
| `components/hud/NavigationFrame.tsx`                   | Apply dot-grid class                            |


