---
name: Brainstorm Terminal Redesign
overview: Redesign the brainstorm panel as a terminal-style chat overlay anchored to the bottom-right, and push the gallery feed down so generations never overlap the HUD corners.
todos:
  - id: brainstorm-terminal
    content: "Rewrite BrainstormPanel as terminal-style fixed overlay: no cards/borders, mono prefix lines, bottom-anchored, grows upward"
    status: completed
  - id: workspace-layout-fix
    content: Move BrainstormPanel out of .body flex into fixed overlay position in ProjectWorkspace
    status: completed
  - id: gallery-top-padding
    content: Add top padding to ForgeGallery .feed so content clears HUD corners
    status: completed
isProject: false
---

# Brainstorm Terminal Redesign

## Three changes

### 1. Brainstorm panel becomes a fixed bottom-right terminal overlay

Currently the brainstorm is a docked right column inside `.body` flex layout, which pushes the gallery sideways. Replace it with a **fixed-position overlay** anchored to the bottom-right, growing upward. It floats above content and does not affect the gallery layout at all.

**Position**: `position: fixed; bottom: prompt-bar-height; right: clamp(24px,4vw,56px)` -- sits just above the prompt bar, aligned with the right HUD rail.

**Terminal aesthetic** (no panels, no card borders):

- No `.card` wrappers, no bordered message containers
- Messages render as plain mono text lines, prefixed with a dim role indicator (`>` for user, `$` for assistant) -- like a terminal session
- No background color differentiation between user/assistant; just subtle color difference in the prefix
- Scrollable message log with transparent background (inherits void)
- Input at the bottom: a single-line text input styled like a terminal prompt (`> _` cursor feel), no border, just a bottom underline
- "Use as prompt" becomes a small inline `[use]` link after assistant messages
- Max height ~50vh so it never covers the full screen; scrolls internally
- Width ~320px

**Layout change in [ProjectWorkspace.tsx](components/generation/ProjectWorkspace.tsx)**: Remove brainstorm from the `.body` flex children entirely. Render it as a sibling of `ForgePromptBar` (both fixed-position, both outside the flow). The `.body` layout becomes just sidebar + main, no third column ever.

### 2. Gallery feed pushed below HUD corners

The gallery content currently starts too high, touching the nav header. Add top padding to the `.feed` in [ForgeGallery.module.css](components/generation/ForgeGallery.module.css) matching the HUD corner offset:

```css
.feed {
  padding: calc(clamp(24px, 4vw, 56px) + 16px) 16px 0;
}
```

This ensures generation cards and the empty state never overlap the HUD corner brackets.

### 3. Files changed

- **[BrainstormPanel.tsx](components/generation/BrainstormPanel.tsx)** -- Rewrite JSX: terminal-style message rendering (prefix lines, no cards), single-line input at bottom, remove "docked"/"floating" variant split (always fixed overlay now)
- **[BrainstormPanel.module.css](components/generation/BrainstormPanel.module.css)** -- Full rewrite: fixed positioning, transparent terminal aesthetic, no borders/cards, mono text, scrollable log
- **[ProjectWorkspace.tsx](components/generation/ProjectWorkspace.tsx)** -- Move BrainstormPanel out of `.body` flex. Render it as a fixed overlay alongside ForgePromptBar, passing the same props
- **[ProjectWorkspace.module.css](components/generation/ProjectWorkspace.module.css)** -- No changes needed (brainstorm is no longer in flex flow)
- **[ForgeGallery.module.css](components/generation/ForgeGallery.module.css)** -- Add top padding to `.feed` to clear HUD corners

