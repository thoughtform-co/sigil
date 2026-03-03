---
name: light mode theme audit
overview: Fix all hardcoded dark-mode colors across the codebase so every component respects the light/dark theme toggle, add missing token definitions, and replace contrast-breaking usages of var(--void) as text color.
todos:
  - id: add-tokens
    content: Add --alert, --font-body, --gold-contrast, --shadow-card tokens to both :root and :root.light in globals.css
    status: completed
  - id: fix-overlays
    content: Replace all hardcoded dark rgba overlay/background values with var(--overlay-bg) or var(--surface-0) across 4 CSS files
    status: completed
  - id: fix-void-text
    content: Replace var(--void) text color with var(--gold-contrast) in 5 locations where it's used on gold-background buttons
    status: completed
  - id: fix-hex
    content: "Replace hardcoded hex colors (#d4b064, #d4a5a5, #c44) with proper tokens"
    status: completed
  - id: fix-shadows
    content: Replace hardcoded dark box-shadows with var(--shadow-card) in 3 canvas/journey components
    status: completed
  - id: fix-routecard
    content: Move hardcoded gradient in RouteCard.tsx to a CSS class with token-based colors
    status: completed
  - id: fix-convertmodal
    content: Replace all 10 hardcoded rgba values in ConvertToVideoModal.module.css with theme tokens
    status: completed
isProject: false
---

# Light Mode Theme Audit and Fix

## Diagnosis

The theme system uses CSS custom properties defined in [app/globals.css](app/globals.css) with `:root` (dark) and `:root.light` overrides. The toggle applies a `.light` class to `<html>`. Most components use the tokens correctly, but **21 locations** bypass the system with hardcoded rgba/hex values or misuse `var(--void)` as a text color (which inverts to light-on-light in light mode).

## Missing tokens in globals.css

Add these to both `:root` and `:root.light`:

- `--alert` -- used 3 times in ForgeGenerationCard but never defined (currently falls back to browser default)
- `--font-body` -- referenced in multiple components but not declared (alias for `--font-sans`)
- `--shadow-card` -- new token for box-shadows that need to adapt between themes

## Fix categories

### A. Hardcoded dark overlays/backgrounds (replace with token)


| File                                                                                   | Line(s)                           | Current                   | Fix                                                          |
| -------------------------------------------------------------------------------------- | --------------------------------- | ------------------------- | ------------------------------------------------------------ |
| [ForgeGenerationCard.module.css](components/generation/ForgeGenerationCard.module.css) | 352                               | `rgba(0, 0, 0, 0.72)`     | `var(--overlay-bg)`                                          |
| [ConvertToVideoModal.module.css](components/generation/ConvertToVideoModal.module.css) | 7                                 | `rgba(5, 4, 3, 0.7)`      | `var(--overlay-bg)`                                          |
| [ConvertToVideoModal.module.css](components/generation/ConvertToVideoModal.module.css) | 20                                | `rgba(10, 9, 8, 0.88)`    | `var(--surface-0)`                                           |
| [ConvertToVideoModal.module.css](components/generation/ConvertToVideoModal.module.css) | 37                                | `rgba(10, 9, 8, 0.15)`    | `var(--dawn-08)`                                             |
| [ConvertToVideoModal.module.css](components/generation/ConvertToVideoModal.module.css) | 160, 180, 208, 248, 263, 511, 521 | `rgba(5, 4, 3, 0.4-0.75)` | `var(--overlay-bg)` or `var(--dawn-08)` depending on context |
| [ForgeSidebar.module.css](components/generation/ForgeSidebar.module.css)               | 178                               | `rgba(5, 4, 3, 0.5)`      | `var(--overlay-bg)`                                          |
| [ForgeSidebar.module.css](components/generation/ForgeSidebar.module.css)               | 192                               | `rgba(10, 9, 8, 0.9)`     | `var(--surface-0)`                                           |
| [ForgeLoadingOverlay.module.css](components/generation/ForgeLoadingOverlay.module.css) | 6                                 | `rgba(5, 4, 3, 0.75)`     | `var(--overlay-bg)`                                          |


### B. `var(--void)` used as text color (zero contrast in light mode)

In light mode `--void` becomes `#ECE3D6` (parchment), so light text on light background is invisible.


| File                                                                                   | Line | Context                   | Fix                                                    |
| -------------------------------------------------------------------------------------- | ---- | ------------------------- | ------------------------------------------------------ |
| [ForgePromptBar.module.css](components/generation/ForgePromptBar.module.css)           | 449  | Generate button text      | `var(--surface-0)` (always contrasts with `--gold` bg) |
| [ConvertToVideoModal.module.css](components/generation/ConvertToVideoModal.module.css) | 296  | Button text on gold bg    | `var(--surface-0)`                                     |
| [ImageGenNode.module.css](components/canvas/nodes/ImageGenNode.module.css)             | 71   | Button text on gold bg    | `var(--surface-0)`                                     |
| [CanvasWorkspace.module.css](components/canvas/CanvasWorkspace.module.css)             | 90   | Button text on gold bg    | `var(--surface-0)`                                     |
| [globals.css](app/globals.css)                                                         | 436  | `.sigil-btn-primary` text | `var(--surface-0)`                                     |


The pattern is always "text on a gold background button." Using `var(--surface-0)` ensures dark text in dark mode (dark bg) and dark text in light mode (light bg) -- but actually we need the *opposite* of void for contrast on gold. A cleaner fix: define a new `--gold-contrast` token: dark mode = `#050403`, light mode = `#F2EAE0`.

### C. Hardcoded hex colors


| File                                                                         | Line | Current               | Fix                                    |
| ---------------------------------------------------------------------------- | ---- | --------------------- | -------------------------------------- |
| [ForgePromptBar.module.css](components/generation/ForgePromptBar.module.css) | 440  | `background: #d4b064` | `var(--gold)`                          |
| [ForgeSidebar.module.css](components/generation/ForgeSidebar.module.css)     | 207  | `color: #d4a5a5`      | New `--alert` token (error/delete red) |
| [CanvasSidebar.module.css](components/canvas/CanvasSidebar.module.css)       | 186  | `var(--red, #c44)`    | Use `--alert` token                    |


### D. Dark-only box shadows


| File                                                                       | Line | Current              | Fix                  |
| -------------------------------------------------------------------------- | ---- | -------------------- | -------------------- |
| [BaseNode.module.css](components/canvas/nodes/BaseNode.module.css)         | 9    | `rgba(0, 0, 0, 0.4)` | `var(--shadow-card)` |
| [ImageGenNode.module.css](components/canvas/nodes/ImageGenNode.module.css) | 131  | `rgba(0, 0, 0, 0.5)` | `var(--shadow-card)` |
| [ImageDiskStack.module.css](components/journeys/ImageDiskStack.module.css) | 45   | `rgba(0, 0, 0, 0.3)` | `var(--shadow-card)` |


### E. Inline hardcoded gradient in TSX


| File                                                | Line | Fix                                                                           |
| --------------------------------------------------- | ---- | ----------------------------------------------------------------------------- |
| [RouteCard.tsx](components/dashboard/RouteCard.tsx) | 132  | Replace hardcoded rgba gradient with a CSS class that uses token-based colors |


## Implementation approach

1. **Add missing tokens** to [globals.css](app/globals.css) in both `:root` and `:root.light`:
  - `--alert` (dark: `#c17f59`, light: `#b5623a`)
  - `--font-body` as alias for `--font-sans`
  - `--gold-contrast` (dark: `#050403`, light: `#F2EAE0`) for text-on-gold buttons
  - `--shadow-card` (dark: `rgba(0,0,0,0.35)`, light: `rgba(17,15,9,0.1)`)
2. **Fix each file** in the categories above -- straightforward find-and-replace of hardcoded values with the correct token.
3. **Verify** no regressions by checking lints on every modified file.

## Files to modify (11 files)

- [app/globals.css](app/globals.css) -- add missing tokens
- [components/generation/ForgeGenerationCard.module.css](components/generation/ForgeGenerationCard.module.css)
- [components/generation/ConvertToVideoModal.module.css](components/generation/ConvertToVideoModal.module.css)
- [components/generation/ForgeSidebar.module.css](components/generation/ForgeSidebar.module.css)
- [components/generation/ForgeLoadingOverlay.module.css](components/generation/ForgeLoadingOverlay.module.css)
- [components/generation/ForgePromptBar.module.css](components/generation/ForgePromptBar.module.css)
- [components/canvas/nodes/BaseNode.module.css](components/canvas/nodes/BaseNode.module.css)
- [components/canvas/nodes/ImageGenNode.module.css](components/canvas/nodes/ImageGenNode.module.css)
- [components/canvas/CanvasWorkspace.module.css](components/canvas/CanvasWorkspace.module.css)
- [components/canvas/CanvasSidebar.module.css](components/canvas/CanvasSidebar.module.css)
- [components/journeys/ImageDiskStack.module.css](components/journeys/ImageDiskStack.module.css)
- [components/dashboard/RouteCard.tsx](components/dashboard/RouteCard.tsx)

