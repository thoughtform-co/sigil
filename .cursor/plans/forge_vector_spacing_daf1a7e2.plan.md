---
name: Forge Vector Spacing
overview: Introduce canonical Thoughtform vector SVGs into the Sigil generation feed and use one as a warm, Dawn-tinted inter-card wayfinding marker, while increasing the vertical gap between stacked generations so the motif has room to breathe.
todos:
  - id: add-canonical-vectors
    content: Add the canonical Thoughtform vector SVG assets to `public/vectors/` so the feed can use brand-authentic motifs instead of improvised geometry.
    status: completed
  - id: build-feed-separator
    content: Create a generation-row/inter-card separator treatment that places a vector motif in the gutter above each card except the first, aligned to the prompt/media seam from the mockup.
    status: completed
  - id: sync-gallery-spacing
    content: Increase stacked-generation spacing in both the CSS feed and the virtualizer gap so the visual spacing is consistent in normal and virtualized rendering.
    status: completed
  - id: tune-dawn-palette
    content: Tint the separator and nearby placeholder treatment toward a warmer Dawn/Gold range so the new motif feels integrated with the mockup rather than stark midday neutral.
    status: completed
  - id: verify-responsive-behavior
    content: Check first-card behavior, mobile stacked layout, and any hover/focus interactions so the separator never crowds content or breaks virtualization measurements.
    status: completed
isProject: false
---

# Forge Vector Spacing

## Target Outcome

Use a real Thoughtform vector as a small wayfinding accent in the space **between** stacked `ForgeGenerationCard` rows, not inside the placeholder itself. The feed should gain more vertical breathing room so the vector reads clearly and the stacked generations feel less compressed.

## Key Files

- [components/generation/ForgeGallery.tsx](components/generation/ForgeGallery.tsx) and [components/generation/ForgeGallery.module.css](components/generation/ForgeGallery.module.css): introduce the inter-card separator/wrapper and increase feed spacing.
- [components/generation/ForgeGenerationCard.tsx](components/generation/ForgeGenerationCard.tsx) and [components/generation/ForgeGenerationCard.module.css](components/generation/ForgeGenerationCard.module.css): add any lightweight hooks/classes needed so the separator aligns cleanly to the card composition and the Dawn-warm treatment matches the mockup.
- [public/vectors/vector-1.svg](public/vectors/vector-1.svg) through [public/vectors/vector-6.svg](public/vectors/vector-6.svg): canonical vector assets copied into the repo for product use.

## Existing Constraints To Preserve

The gallery spacing currently lives in two places and must stay synchronized:

```14:25:components/generation/ForgeGallery.module.css
.feed {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  width: 100%;
  max-width: var(--layout-content-md, 1200px);
  padding: calc(var(--hud-padding, 40px) + 16px) 16px var(--feed-padding-bottom, 260px);
}
```

```223:229:components/generation/ForgeGallery.tsx
const rowVirtualizer = useVirtualizer({
  count: generations.length,
  getScrollElement: () => feedRef.current,
  estimateSize: () => 400,
  overscan: 3,
  gap: 24,
});
```

## Implementation Approach

1. Add the canonical vector SVG set under `public/vectors/` from the Thoughtform brand source so the feed uses the real motif family rather than local bracket-only stand-ins.
2. Refactor the gallery row markup so each generation can own a small top gutter. That gutter will host the vector marker for rows after the first, which is cleaner than forcing the vector into `ForgeGenerationCard`'s internal content box.
3. Increase the vertical inter-card spacing from the current `24px` to a larger token-based rhythm in the `32px` to `48px` range, then keep the same value in both `.feed` and `useVirtualizer({ gap })`.
4. Place the vector at the left transition between prompt column and media column, matching the mockup's seam/waypoint feel instead of centering it in the card.
5. Warm the separator treatment with low-opacity Dawn/Gold values so it feels like a soft navigational instrument, not a hard midday-bright ornament. If needed, lightly tune the processing-state surface around it for harmony, without changing card structure or control behavior.

## Notes

- The repo does not currently contain `public/vectors/`, so the plan assumes creating that directory.
- I did not find existing `vector-1` through `vector-6` usage in the codebase, which makes this a clean first integration point.
- The separator should be suppressed for the first card and handled carefully on narrow screens so the mobile single-column layout does not get visually crowded.

