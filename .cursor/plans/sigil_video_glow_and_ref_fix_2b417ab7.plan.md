---
name: sigil_video_glow_and_ref_fix
overview: Add full Vesper reference-image persistence flow (server-stored reference pointers) plus stacked video glow indicators, while removing conflicting corner/frame visuals.
todos:
  - id: add-reference-storage-flow
    content: Implement server-side reference-image upload/persistence and return stable reference URL/pointer
    status: completed
  - id: wire-reference-upload-endpoint
    content: Add API endpoint for reference image upload and pointer resolution with auth/project scoping
    status: completed
  - id: fix-reference-pipeline
    content: Normalize and pass resolved reference image URL fields through process route and adapter request shape
    status: completed
  - id: wire-kling-start-image
    content: Update Replicate video generation to use start_image for image-to-video when reference exists
    status: completed
  - id: add-iteration-summary
    content: Return count/hasProcessing/latestStatus from video-iterations API and expose in hook
    status: completed
  - id: add-stack-hint-ui
    content: Implement Vesper-style stacked green glow indicator component and integrate in ForgeGenerationCard
    status: completed
  - id: remove-corners-and-frame
    content: Remove media corner brackets/frame background and keep clean image presentation
    status: completed
  - id: validate-end-to-end
    content: Run focused flow validation for image-to-video reference fidelity and new indicator states
    status: completed
isProject: false
---

# Sigil Vesper Reference Parity + Stack Glow Plan

## Goals

- Match Vesper’s reliable reference flow by persisting uploaded reference images server-side and using stable URLs/pointers in generation requests.
- Ensure reference images are actually consumed by both image and video generation.
- Add a Vesper-style stacked soft glow marker on image outputs that have video iterations (or are currently generating one).
- Remove conflicting corner brackets and residual frame/background visuals behind generated images.

## Implementation Steps

- **Vesper-style reference persistence flow (backend + storage)**
  - Add a dedicated reference upload path in Supabase storage (Vesper parity), separate from generated outputs.
  - Add an authenticated upload endpoint (project-scoped) that accepts an image file/data URL and returns a stable public URL plus lightweight pointer metadata.
  - Keep reference upload idempotent for repeated reuse (same source image can be reused without re-uploading where possible).
  - Ensure cleanup strategy is explicit (e.g., retain references with project lifespan unless deleted).
- **Reference-image pipeline parity (generation dispatch)**
  - Update `[app/api/generate/process/route.ts](c:/Users/buyss/Dropbox/03_Thoughtform/08_Artifacts/05_sigil.thoughtform/app/api/generate/process/route.ts)` to pass both normalized top-level fields and original `parameters` into `adapter.generate(...)`.
  - Resolve `parameters.referenceImageUrl` to adapter-friendly fields (`referenceImage` / `referenceImages`) before dispatch.
  - Ensure same normalization is applied for image and video routes.
  - Keep existing status lifecycle (`processing` → `processing_locked` → `completed|failed`) untouched.
- **Prompt bar + convert modal parity wiring**
  - Update prompt/convert flows to upload local reference images first, then submit stable URL pointers to `/api/generate` instead of raw transient data URLs.
  - Preserve pasted external URL behavior as-is (no forced re-upload for already-public URLs).
- **Kling/Replicate image-to-video wiring**
  - Update `[lib/models/adapters/replicate.ts](c:/Users/buyss/Dropbox/03_Thoughtform/08_Artifacts/05_sigil.thoughtform/lib/models/adapters/replicate.ts)` video path to map reference image to Kling `start_image` when present (Vesper parity behavior).
  - Keep text-to-video fallback when no reference image is provided.
  - Add defensive extraction from both `request.parameters.referenceImageUrl` and top-level request fields.
- **Image model reference parity**
  - Ensure image adapters consume normalized `referenceImage` / `referenceImages` fields consistently for Gemini + Replicate fallback paths.
  - Add one lightweight debug marker in response metadata (non-UI) to confirm whether a reference was attached during generation dispatch.
- **Video iteration summary for card indicators**
  - Extend `[app/api/outputs/[id]/video-iterations/route.ts](c:/Users/buyss/Dropbox/03_Thoughtform/08_Artifacts/05_sigil.thoughtform/app/api/outputs/[id]/video-iterations/route.ts)` to return lightweight summary metadata (`count`, `hasProcessing`, `latestStatus`) and optional `limit` support for efficient per-card checks.
  - Update `[hooks/useVideoIterations.ts](c:/Users/buyss/Dropbox/03_Thoughtform/08_Artifacts/05_sigil.thoughtform/hooks/useVideoIterations.ts)` to expose summary fields while preserving existing modal behavior.
- **Vesper-style stacked glow indicator (UI)**
  - Add a Sigil component (e.g. `VideoIterationsStackHint`) under `[components/generation/](c:/Users/buyss/Dropbox/03_Thoughtform/08_Artifacts/05_sigil.thoughtform/components/generation/)` inspired by Vesper’s layering logic, adapted to Sigil tokens.
  - Integrate it in `[components/generation/ForgeGenerationCard.tsx](c:/Users/buyss/Dropbox/03_Thoughtform/08_Artifacts/05_sigil.thoughtform/components/generation/ForgeGenerationCard.tsx)` for image outputs only, positioned behind media with overflow-visible container.
  - Behavior:
    - No videos + not processing: convert icon only on hover.
    - Has videos or processing: persistent green-tinted stacked glow + icon glow.
    - Processing state: subtle pulse animation.
- **Remove corners/frame conflicts**
  - Refactor `[components/generation/ForgeGenerationCard.module.css](c:/Users/buyss/Dropbox/03_Thoughtform/08_Artifacts/05_sigil.thoughtform/components/generation/ForgeGenerationCard.module.css)`:
    - Remove corner bracket pseudo-elements (`.mediaFrame::before/::after`, `.cornerMarks::`*) for output media cards.
    - Remove any residual frame/background behind the generated image container.
    - Keep hover actions and media aspect-ratio behavior intact.
  - If needed, add a reusable pulse keyframe in `[app/globals.css](c:/Users/buyss/Dropbox/03_Thoughtform/08_Artifacts/05_sigil.thoughtform/app/globals.css)` for stack animation.

## Why this likely explains the current issue

- Current Sigil flow stores generated outputs in `outputs` but does not persist local uploaded references as stable assets before generation.
- Dispatch shaping between UI payloads and adapters is inconsistent, especially across top-level vs nested reference fields.
- Result: image references may be dropped or handled inconsistently; image-to-video can silently run as text-to-video when `start_image` is missing.

## Validation Checklist

- Upload local reference image in prompt bar, submit image generation, and verify backend dispatch uses a stable stored URL (not transient blob/data URL).
- Repeat generation with same reference and verify pointer reuse path remains valid.
- Convert image → video from an image card; confirm API request includes reference image fields and adapter input includes `start_image`.
- Confirm resulting video visibly follows source-image composition/style.
- Confirm image generation also reflects reference style/composition (not only prompt text influence).
- Confirm image card shows stacked soft green glow after at least one linked video iteration exists.
- Confirm glow pulses while linked iteration status is `processing` / `processing_locked`.
- Confirm corner brackets and unwanted frame/background are gone from generated image cards.
- Confirm no regressions in hover actions, lightbox, or convert-to-video modal updates.

