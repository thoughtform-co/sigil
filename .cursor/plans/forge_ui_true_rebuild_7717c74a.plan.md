---
name: Forge UI True Rebuild
overview: Replace all current Sigil generation UI components with true Atlas Forge patterns -- thumbnail sidebar, single-column video feed, compact horizontal prompt bar with inline controls, and full-width generation cards with prompt banners and hover icon actions. Backend logic stays identical.
todos:
  - id: card-rebuild
    content: Rewrite ForgeGenerationCard with prompt banner, 16:9 media, corner accents, scanlines, hover icon actions, processing diamond overlay, failed state
    status: completed
  - id: prompt-bar-rebuild
    content: "Rewrite ForgePromptBar as compact horizontal bar: model pill, unified container with image upload + textarea + arrow button, inline param pills"
    status: completed
  - id: gallery-rebuild
    content: Rewrite ForgeGallery from grid to single-column centered feed (max 720px)
    status: completed
  - id: sidebar-rebuild
    content: Rewrite ForgeSidebar as 72px thumbnail strip with 64x64 squares, hover tooltips, icon overlays
    status: completed
  - id: cost-ticker-fix
    content: Update ForgeCostTicker to Atlas format with REPLICATE label, fixed top-right, expand-on-hover
    status: completed
  - id: workspace-layout
    content: Adjust ProjectWorkspace layout for narrow sidebar, centered feed, brainstorm as overlay
    status: completed
  - id: build-verify
    content: Build and verify no compile errors, no broken API contracts
    status: completed
isProject: false
---

# Forge UI True Rebuild

## Problem

The previous "rebuild" just reorganized the old Sigil layout with CSS Modules. It looks nothing like Atlas Forge. Every component needs to be rewritten to match Atlas's actual visual architecture: compact sidebar thumbnails, single-column card feed, unified prompt bar with inline controls, and full-width media-first generation cards.

## What Changes (UI only, backend stays identical)

All files are in `components/generation/`. The orchestrator (`ProjectWorkspace.tsx`) keeps the same state management and API calls -- only the JSX/CSS of child components changes.

## Component-by-Component Diff

### 1. ForgeSidebar -- Thumbnail Strip (not text list)

**Current**: 240px wide, text-only session names, "+ Image" / "+ Video" buttons, brainstorm toggle.

**Atlas source**: [ForgeSidebar.tsx](src/components/forge/ForgeSidebar.tsx) + [ForgeSidebar.module.css](src/components/forge/ForgeSidebar.module.css)

**Target**: 72px narrow column of 64x64 thumbnail squares. Session name appears as a hover tooltip to the right. "+" button at top for new sessions. Active session gets gold border. Delete/rename on hover overlay icons.

**Key CSS changes**:

- `.sidebar` width: 240px -> 72px
- Session items become 64x64 squares with thumbnail images
- Session name/type info becomes a hover tooltip (`.sessionInfo`) positioned to the right
- Delete button becomes a small icon overlay on hover
- Brainstorm toggle moves out of sidebar (it doesn't belong in the Atlas pattern)

**Adaptation for Sigil**: Atlas sidebar navigates via `router.push`. Sigil sidebar calls `onSessionSelect(id)` callback since it's in-page state. Session thumbnails: use the first output image from the session's latest generation, or a diamond placeholder if none. Needs to fetch thumbnail data from the API or pass it through props.

### 2. ForgeGallery -- Single-Column Feed (not grid)

**Current**: 2-3 column responsive grid with a "Generation gallery" header label.

**Atlas source**: [ForgeGallery.module.css](src/components/forge/ForgeGallery.module.css)

**Target**: Single-column centered feed (`flex-direction: column; align-items: center; max-width: 720px`). No grid. Cards stack vertically with 16px gap. 200px bottom padding for prompt bar clearance.

**Key CSS changes**:

- Remove `.grid` with `grid-template-columns`
- Replace with `flex-direction: column; align-items: center`
- Cards get `max-width: 720px; width: 100%`
- Remove the "Generation gallery" label (Atlas doesn't have one)

### 3. ForgeGenerationCard -- Full-Width Media Card (not metadata block)

**Current**: Small card with status/model text, 2-line prompt, text action buttons, tiny 176px media. Like a data row.

**Atlas source**: [ForgeVideoCard.tsx](src/components/forge/ForgeVideoCard.tsx) + [ForgeVideoCard.module.css](src/components/forge/ForgeVideoCard.module.css)

**Target**: Full-width card (max 720px) with:

- **Prompt banner** at top: mono text, single line, click-to-copy, glassmorphism background
- **16:9 media container** below: full-width, `object-fit: contain`
- **Corner accents**: `::before`/`::after` pseudo-elements with 12px L-shaped borders
- **Scanlines on hover**: repeating-linear-gradient overlay
- **Processing state**: Source image dimmed + diamond progress indicator with percentage + phase messages ("Navigating latent topology...")
- **Failed state**: Diamond X icon + Thoughtform error titles ("Traversal collapsed")
- **Hover actions**: Bottom-right icon buttons (approve/star, download, reuse) appearing on hover with glassmorphism backgrounds
- **Approved badge**: Gold check square, top-right

**Significant rewrite**: The card structure is completely different. Must handle both image and video outputs in the same 16:9 container pattern.

### 4. ForgePromptBar -- Compact Horizontal Bar (not form)

**Current**: Massive form with separate Mode/Model rows, 4-dropdown parameter grid, 3-row textarea, Generate/Enhance text buttons, URL input. Takes up ~40% of the viewport.

**Atlas source**: [ForgePromptBar.tsx](src/components/forge/ForgePromptBar.tsx) + [ForgePromptBar.module.css](src/components/forge/ForgePromptBar.module.css)

**Target**: Compact single-row bar with:

- **Model picker** (left): Small pill button showing model name + chevron, dropdown opens upward
- **Unified container** (center): Horizontal layout with:
  - Image upload zone (80x80, dashed border, drag+drop, "+" / "IMAGE" placeholder)
  - Textarea (auto-sizing, no visible border, transparent background)
  - Gold generate arrow button (48x80px, right side)
- **Parameter pills** (below textarea, inside container): Inline row with small pill buttons for NEG toggle, resolution select, duration toggle (5s/10s), aspect ratio

**Adaptation for Sigil**: Atlas prompt bar is video-only (image-to-video). Sigil handles both image and video generation. The mode toggle (IMAGE/VIDEO) should be a small pill group within the params row. The "Enhance" button becomes a small pill in the params row too. Reference image URL input can be replaced by the image upload zone for a much better UX (but keep URL input as a fallback if no file API is available).

### 5. ForgeCostTicker -- Top-Right HUD Readout

**Current**: Basic text "$0.00 30D" with a dropdown.

**Atlas source**: [ForgeCostTicker.tsx](src/components/forge/ForgeCostTicker.tsx)

**Target**: Fixed top-right position, "REPLICATE $XX.XX" format, expand-on-hover details panel with per-model breakdown. Uses the existing `/api/analytics/overview` endpoint but formats the display differently.

### 6. ProjectWorkspace Layout

**Current**: Three-column layout (sidebar 240px | gallery flex-1 | brainstorm 320px) + massive prompt bar fixed at bottom.

**Target**: 

- Sidebar: 72px narrow fixed left
- Main content: Centered column feed, scrollable
- Brainstorm: Slides in as overlay or right panel on toggle (not always visible)
- Prompt bar: Compact fixed bottom, centered (max 900px)
- Cost ticker: Fixed top-right

## Implementation Order

1. **ForgeGenerationCard** -- the most visually impactful change (prompt banner + 16:9 media + corner accents + hover actions)
2. **ForgePromptBar** -- compact horizontal bar with inline controls
3. **ForgeGallery** -- change from grid to single-column feed
4. **ForgeSidebar** -- thumbnail strip
5. **ForgeCostTicker** -- minor formatting
6. **ProjectWorkspace** -- layout adjustments for new component sizes
7. **BrainstormPanel** -- adjust to work as overlay toggle, not permanent column

## Backend: Zero Changes

All API calls, request shapes, and response handling remain identical. The only changes are JSX structure and CSS.