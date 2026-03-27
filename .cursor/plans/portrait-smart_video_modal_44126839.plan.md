---
name: portrait-smart video modal
overview: Adjust the img-to-video modal so it regains a bit of height, stays balanced with short content, and responds intelligently to portrait source images by adapting the preview container and internal spacing rather than just growing whitespace.
todos:
  - id: derive-source-orientation
    content: Use the existing source-image aspect detection in `ConvertToVideoModal.tsx` to expose a portrait/landscape layout mode for the modal.
    status: completed
  - id: rebalance-shell-height
    content: Increase the modal’s overall height modestly and tune spacing so the layout no longer feels cramped.
    status: completed
  - id: portrait-frame-rules
    content: "Add portrait-specific frame/container sizing in `ConvertToVideoModal.module.css` while preserving `object-fit: contain`."
    status: completed
  - id: validate-modal-balance
    content: Check landscape and portrait cases, plus short and long iterations lists, to confirm the modal stays balanced without excessive dead space.
    status: completed
isProject: false
---

# Portrait-Smart Video Modal

## What I’d change

- Increase the modal shell slightly in [components/generation/ConvertToVideoModal.module.css](components/generation/ConvertToVideoModal.module.css) so it no longer feels cramped, but keep a viewport cap so it never becomes unwieldy.
- Reuse the existing source-aspect detection already present in [components/generation/ConvertToVideoModal.tsx](components/generation/ConvertToVideoModal.tsx) to drive a portrait-aware layout mode instead of treating every source as landscape.
- Preserve the current `object-fit: contain` treatment for the start/end frames, and adapt the **container ratio and spacing** instead. That keeps the source image truthful while using the modal’s height more intelligently.

## Why It Feels Off Now

Two current constraints are doing most of the work:

- In [components/generation/ConvertToVideoModal.module.css](components/generation/ConvertToVideoModal.module.css), the shell is now only capped with `max-height: min(84vh, 720px);`, which can make the dialog feel tighter than before when content is short.
- The preview containers are locked to `aspect-ratio: 16 / 9;` via `.frameCard, .endFrameCard`, which is fine for landscape images but creates awkward internal dead space when the source is portrait.

## Recommended Hybrid Strategy

- Keep the dialog a bit taller overall by adding a modest `min-height` or restoring a slightly larger default shell height.
- Add a `data-source-orientation="portrait" | "landscape"` attribute on the modal or form section from [components/generation/ConvertToVideoModal.tsx](components/generation/ConvertToVideoModal.tsx).
- For portrait sources:
  - switch the frame area to a portrait-friendly ratio such as `3 / 4` or `4 / 5` instead of `16 / 9`
  - tighten the vertical gaps below the frame so the extra height goes into the image block first
  - keep the right iterations column independently scrollable so the shell does not need to expand just because there are many videos
- For landscape sources:
  - keep the current layout behavior close to what it is now

## Frontend Best Practices To Apply

- **Respond to content shape, not just screen size**: portrait-vs-landscape is a content breakpoint, so the modal should react to the source media orientation in addition to viewport width.
- **Change containers before changing media**: keep `object-fit: contain` for fidelity, and adjust the frame ratio/available space instead of cropping or stretching the image.
- **Use bounded flexibility**: `min()`, `max()`, and `clamp()` for shell height and frame height so portrait media gets more room, but the modal still respects the viewport.
- **Let panels scroll independently**: keep [components/generation/ConvertToVideoModal.module.css](components/generation/ConvertToVideoModal.module.css) using internal scroll regions for the form and iterations, rather than forcing the whole dialog to carry blank space.
- **Bias space toward the hero surface**: when there is extra vertical room, spend it on the start-frame area before the metadata rows.

## File Targets

- [components/generation/ConvertToVideoModal.tsx](components/generation/ConvertToVideoModal.tsx)
  - expand the existing source-image aspect detection into a layout/orientation flag
  - attach that flag as a data attribute for CSS to consume
- [components/generation/ConvertToVideoModal.module.css](components/generation/ConvertToVideoModal.module.css)
  - raise shell height slightly
  - add portrait-specific frame/container rules
  - rebalance gaps/padding so the lower controls do not look pinched

## Validation

- Landscape inputs still feel stable and close to the current layout.
- Portrait inputs use more vertical space for the frame instead of showing excess internal blank area.
- The iterations panel keeps scrolling cleanly when there are many videos.
- The modal never exceeds the viewport or reintroduces the large dead zone at the bottom.

