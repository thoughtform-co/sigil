---
name: Preview image sharpness
overview: Increase the resolution and quality of the preview image in ForgeGenerationCard by correcting the `sizes` hint and adding an explicit `quality` prop to the Next.js Image component.
todos:
  - id: update-sizes-quality
    content: "Update both <Image> instances in ForgeGenerationCard.tsx: change sizes to '(max-width: 980px) 90vw, min(900px, 60vw)' and add quality={85}"
    status: completed
isProject: false
---

# Preview Image Sharpness

## Problem

The `<Image>` component in `[ForgeGenerationCard.tsx](components/generation/ForgeGenerationCard.tsx)` uses:

- `sizes="(max-width: 980px) 90vw, 660px"` -- understates the actual display width (~800px on desktop)
- No `quality` prop -- defaults to Next.js 75

This causes the browser to request a smaller, more compressed image than the display area needs, resulting in a visibly soft/low-res preview.

## Changes

### 1. Update `sizes` hint in `[ForgeGenerationCard.tsx](components/generation/ForgeGenerationCard.tsx)`

Both `<Image>` instances (lines 155-161 and 165-172) currently use `sizes="(max-width: 980px) 90vw, 660px"`.

Change to: `sizes="(max-width: 980px) 90vw, min(900px, 60vw)"`

This more accurately reflects the actual layout:

- Mobile (<=980px): image is ~90% of viewport (unchanged, already correct)
- Desktop (>980px): image is ~60% of viewport, capped at ~900px

On a 2x display at 900px, the browser will request the 1920px variant from Next.js's default `deviceSizes`, which is a significant improvement over the current ~1200px.

### 2. Add `quality` prop

Add `quality={85}` to both `<Image>` instances. This bumps from the default 75 to 85 -- a meaningful visual improvement with only a modest file size increase (~15-20% larger). This keeps things economical compared to quality 100 while eliminating visible compression artifacts.

### Summary of tradeoffs


| Setting                          | Before        | After            |
| -------------------------------- | ------------- | ---------------- |
| sizes (desktop)                  | 660px         | min(900px, 60vw) |
| quality                          | 75 (default)  | 85               |
| Approx image served (2x desktop) | ~1200px @ q75 | ~1920px @ q85    |


The lightbox (plain `<img>` in ForgeGallery) remains unchanged -- it already loads the full-resolution original.