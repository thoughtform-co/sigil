---
name: generation card action bar
overview: Replace the hover-overlay action buttons on generated images/videos with a persistent action bar below the media, reorder buttons to the user's specification, rename Approve to Bookmark, and add a reference image thumbnail with popup to the prompt panel.
todos:
  - id: action-bar-tsx
    content: "Restructure ForgeGenerationCard.tsx: remove hoverActions overlay, add persistent actionBar below mediaFrame with buttons in specified order"
    status: completed
  - id: bookmark-rename
    content: Replace Approve checkmark with Bookmark icon and update tooltip text
    status: completed
  - id: ref-thumb
    content: Add reference image thumbnail to promptPanel with click-to-enlarge popup
    status: completed
  - id: action-bar-css
    content: "Update ForgeGenerationCard.module.css: remove hover overlay styles, add actionBar and refThumb/refPopup styles"
    status: completed
  - id: video-hint-split
    content: Move VideoIterationsStackHint button into the action bar while keeping the stack glow effect on the frame
    status: completed
isProject: false
---

# Generation Card Action Bar Redesign

## Current State

The action buttons in [ForgeGenerationCard.tsx](components/generation/ForgeGenerationCard.tsx) are positioned as a hover overlay (`.hoverActions`) with `opacity: 0` that fades in on `:hover`. This makes them invisible in light mode and hard to discover. The current buttons are: Download (top-left), Approve/Unapprove (top-right), Reuse parameters (bottom-left), Use as reference (bottom-left), and Convert to video (via `VideoIterationsStackHint`, bottom-right corner).

## Changes

### 1. Move action buttons from hover overlay to a persistent row below the media

Remove the `.hoverActions` overlay `<div>` and its four positional containers. Instead, add a new `.actionBar` row **below** the `.mediaFrame` (inside each `<article>` output card). This bar is always visible, not gated on hover.

**Button order (left to right):**

- **Reuse parameters** (recycle icon)
- **Bookmark** (bookmark icon -- replaces the current "Approve" checkmark)
- **Download** (download icon)
- Spacer / flex-grow gap
- **Use as reference** (only for images, not videos)
- **Convert to video frame** (video icon -- move from `VideoIterationsStackHint` into this bar, far right)

### 2. Rename Approve to Bookmark

- Keep the existing `isApproved` database field and `onApprove` callback as-is (no backend change)
- Change the icon from a checkmark to a bookmark icon (flag/ribbon SVG)
- Change tooltip text from "Approve" / "Unapprove" to "Bookmark" / "Remove bookmark"
- Update the `.actionActive` style to use the gold accent for bookmarked state

### 3. Add reference image thumbnail to the prompt panel

In the `.promptPanel` `<aside>`, after the prompt text block and before the meta readouts, if `generation.parameters?.referenceImageUrl` exists:

- Render a small clickable thumbnail (roughly 48x48, cropped square)
- On click, show a popup/modal overlay displaying the reference image at a comfortable size (e.g., max 600px width, centered, with a dark scrim backdrop that dismisses on click)
- This requires adding local state (`refPopupOpen`) to `ForgeGenerationCard`

### 4. Style the action bar

In [ForgeGenerationCard.module.css](components/generation/ForgeGenerationCard.module.css):

- Remove `.hoverActions`, `.actionsTopLeft`, `.actionsTopRight`, `.actionsBottomLeft`, `.actionsBottomRight` styles
- Add `.actionBar`: `display: flex; align-items: center; gap: 6px; padding: 6px 0; margin-top: 4px;`
- Add `.actionBarSpacer`: `flex: 1;`
- Keep `.actionButton` styling but remove the dark `rgba(10,9,8,0.82)` background, use `background: transparent` with `border: 1px solid var(--dawn-12)` for a light-mode-friendly look
- Add `.refThumb` and `.refPopup` styles for the reference image thumbnail and popup

### 5. Move VideoIterationsStackHint into the action bar

Currently the `VideoIterationsStackHint` is rendered inside the `.mediaFrame` with absolute positioning. Move its button rendering into the action bar as the rightmost element. The stack glow layers (the visual hint behind the frame) should remain where they are -- only the clickable button moves into the bar.

## Files to modify

- [components/generation/ForgeGenerationCard.tsx](components/generation/ForgeGenerationCard.tsx) -- main restructure
- [components/generation/ForgeGenerationCard.module.css](components/generation/ForgeGenerationCard.module.css) -- remove hover styles, add action bar styles
- [components/generation/VideoIterationsStackHint.tsx](components/generation/VideoIterationsStackHint.tsx) -- may need a prop to hide the button when rendered in the bar (or split into two components: StackGlow + StackButton)
- [components/generation/VideoIterationsStackHint.module.css](components/generation/VideoIterationsStackHint.module.css) -- minor adjustments if the button is separated

## Note

Your message was cut off at "then I think" -- if there was more to the request, let me know and I can adjust the plan before executing.