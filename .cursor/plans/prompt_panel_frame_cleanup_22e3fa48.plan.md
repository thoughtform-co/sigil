---
name: prompt_panel_frame_cleanup
overview: "Rework generation cards using Krea as an information-architecture reference only: fixed prompt-module height, inner hover-scroll text region, and a uniform footer band, all expressed through Thoughtform’s own design language."
todos:
  - id: split-prompt-module
    content: Refactor the left column in `ForgeGenerationCard.tsx` into a fixed prompt frame plus a separate aligned footer band instead of one flexible stacked panel.
    status: completed
  - id: normalize-prompt-geometry
    content: Update `ForgeGenerationCard.module.css` so every desktop generation uses the same prompt-module height, with a dedicated inner text scroller and hover/focus-only scrollbar reveal.
    status: completed
  - id: align-footer-clusters
    content: Re-layout reference image, ID/model/date/status, and actions into consistent footer clusters with stable spacing and baseline alignment across cards.
    status: completed
  - id: preserve-state-rhythm
    content: Make failed, processing, and empty states inherit the same prompt-module footprint so feed rhythm stays consistent even when media is missing.
    status: completed
  - id: verify-feed-parity
    content: Validate image/video cards and responsive stacked layouts to ensure the fixed prompt module does not clip, overflow, or create awkward gaps.
    status: completed
isProject: false
---

# Prompt Module Normalization

## Goal

Adopt the behavioral discipline of the Krea prompt cards without copying their product aesthetics: every generation should use the same prompt-module height, long prompts should scroll inside that module, and the supporting reference/readout area should align consistently across items while still reading unmistakably as Sigil.

## Reference Boundary

- Krea is the reference for **information density and card behavior**, not for brand styling.
- Sigil should keep Thoughtform’s spatial grammar: sharp geometry, zero-radius surfaces, hairline dividers, restrained gold wayfinding, and depth via surface layers rather than soft card UI.
- Any Krea-derived behavior must be translated into the existing Thoughtform system rather than reproduced literally.

## Live Reference Findings

- Krea prompt cards were uniform across sampled items at `323 x 240`.
- The prompt text lived inside a nested scroll region at `283 x 200`.
- The scrollbar appeared only on hover.
- A separate footer row sat directly under the prompt block at `323 x 32`, using stable left/right clusters.
- The prompt card never grew with prompt length; only the inner text region scrolled.

## Scope

- Structure: [components/generation/ForgeGenerationCard.tsx](components/generation/ForgeGenerationCard.tsx)
- Styling: [components/generation/ForgeGenerationCard.module.css](components/generation/ForgeGenerationCard.module.css)
- Feed sanity-check: [components/generation/ForgeGallery.module.css](components/generation/ForgeGallery.module.css)

## Current Constraint

```269:358:components/generation/ForgeGenerationCard.tsx
<div className={cardClass}>
  <aside className={styles.promptPanel}>
    <button
      type="button"
      className={`${styles.promptBlock} ${copied ? styles.promptCopied : ""}`}
      onClick={copyPrompt}
      title="Copy prompt"
    >
      <span className={styles.promptText}>{generation.prompt || "No prompt"}</span>
      {copied && <span className={styles.copiedBadge}>COPIED</span>}
    </button>
    {/* reference thumb, readouts, and actions continue in the same stack */}
  </aside>
```

- The entire left column is currently one flexible stack, which makes prompt height, internal alignment, and footer positioning less uniform than the Krea pattern.

## Implementation Approach

- Refactor the left column into a prompt module with:
  - a fixed-height prompt frame
  - an inner scroll region for the prompt text
  - a consistently aligned footer band for reference + readouts/actions
- Keep Thoughtform styling rather than Krea's rounded visual language:
  - `surface-0` depth layers
  - hairline borders
  - zero-radius geometry
  - restrained gold accents only for active/wayfinding affordances
- Treat Krea as a compression model, not a visual template:
  - preserve dense, uniform information packing
  - avoid rounded dark cards, soft consumer-SaaS polish, and generic pill-heavy styling
  - align the result with the wider Sigil HUD/world so it feels native to routes, sessions, and workspace rails
- Normalize prompt geometry so every desktop generation card uses the same left-module height regardless of prompt length.
- Hide scrollbars until hover/focus while keeping prompt text scrollable and accessible.
- Reorganize reference image, ID/model/date/status, and actions into stable clusters with consistent baseline alignment.
- Make failed, processing, and empty states inherit the same prompt-module dimensions so the feed rhythm stays intact even without media.
- Sanity-check feed spacing and narrow breakpoint behavior so the fixed module still works when the layout stacks.

## Validation Checklist

- All desktop generations share the same prompt-module height.
- Long prompts scroll inside the prompt frame instead of stretching the left column.
- The scrollbar becomes visible on hover/focus only.
- Reference/thumb + metadata align consistently across cards.
- Failed/no-output cards retain the same left-column footprint and remain legible.
- Image and video cards still render cleanly at desktop and mobile breakpoints.
- The result feels like an extension of Thoughtform/Sigil rather than a Krea clone.

