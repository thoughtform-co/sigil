---
name: sigil_convert_to_video_modal
overview: Implement a full Vesper-like Convert-to-Video popup in Sigil (no tab jump), including model/params/session selection and an iteration/history stack, using Sigil visual language and existing APIs.
todos:
  - id: workspace-modal-orchestration
    content: Replace route-jump convert flow with modal state in ProjectWorkspace and keep user on image page
    status: completed
  - id: build-convert-modal
    content: Implement ConvertToVideoModal with prompt/model/params/session controls using Sigil design
    status: completed
  - id: video-iterations-api
    content: Add API route to fetch video iterations by source output ID with auth checks
    status: completed
  - id: iterations-hook-and-ui
    content: Add useVideoIterations hook and render iteration/history stack in modal with polling
    status: completed
  - id: trigger-context-wiring
    content: Pass outputId/imageUrl from ForgeGenerationCard through ForgeGallery to modal open handler
    status: completed
  - id: payload-parity-and-submit
    content: Submit parity payload to /api/generate with sourceOutputId/referenceImageId/referenceImageUrl
    status: completed
  - id: styling-and-polish
    content: Style modal and iteration stack in Sigil visual language and responsive layout
    status: completed
  - id: verification
    content: Run lint/build and verify no route jump + successful video generation and iteration updates
    status: completed
isProject: false
---

# Convert-to-Video Modal (Full Parity)

## Goal

Replace the current route jump (`/video?ref=...`) with an in-place Sigil modal that lets users animate an image using video models, configure parameters, choose/create video sessions, submit generation, and track resulting video iterations in the same popup.

## Implementation Plan

### 1) Add modal orchestration in Project Workspace

- Update [c:\Users\buyss\Dropbox\03_Thoughtform\08_Artifacts\05_sigil.thoughtform\components\generation\ProjectWorkspace.tsx](c:\Users\buyss\Dropbox\03_Thoughtform\08_Artifacts\05_sigil.thoughtform\components\generation\ProjectWorkspace.tsx) to:
  - Replace `router.push('/video?ref=...')` in `handleConvertToVideo` with modal-open state.
  - Store active source output context (`outputId`, `imageUrl`, optional `generationId`).
  - Keep user on current image page after submit.
  - Trigger gallery refresh/realtime reconciliation after submission.

### 2) Build a dedicated Sigil modal component (full controls)

- Create [c:\Users\buyss\Dropbox\03_Thoughtform\08_Artifacts\05_sigil.thoughtform\components\generation\ConvertToVideoModal.tsx](c:\Users\buyss\Dropbox\03_Thoughtform\08_Artifacts\05_sigil.thoughtform\components\generation\ConvertToVideoModal.tsx).
- Base UX on existing [c:\Users\buyss\Dropbox\03_Thoughtform\08_Artifacts\05_sigil.thoughtform\components\ui\Dialog.tsx](c:\Users\buyss\Dropbox\03_Thoughtform\08_Artifacts\05_sigil.thoughtform\components\ui\Dialog.tsx), but styled in Sigil language.
- Include:
  - Source image preview (locked reference image).
  - Prompt input.
  - Video model selector (video-only models).
  - Video params (duration, aspect ratio, resolution, num outputs where supported).
  - Session mode: existing video session OR create new video session.
  - Submit state, error handling, close behavior.

### 3) Add full iteration/history stack in modal

- In [c:\Users\buyss\Dropbox\03_Thoughtform\08_Artifacts\05_sigil.thoughtform\components\generation\ConvertToVideoModal.tsx](c:\Users\buyss\Dropbox\03_Thoughtform\08_Artifacts\05_sigil.thoughtform\components\generation\ConvertToVideoModal.tsx):
  - Show a right-side/secondary panel listing video iterations for the source image.
  - Poll while processing; stop when idle.
  - Render statuses (`processing`, `completed`, `failed`), thumbnail/video preview, timestamps.
- Add hook [c:\Users\buyss\Dropbox\03_Thoughtform\08_Artifacts\05_sigil.thoughtform\hooks\useVideoIterations.ts](c:\Users\buyss\Dropbox\03_Thoughtform\08_Artifacts\05_sigil.thoughtform\hooks\useVideoIterations.ts) for fetch + polling lifecycle.

### 4) Expose backend endpoint for source-image video iterations

- Add route [c:\Users\buyss\Dropbox\03_Thoughtform\08_Artifacts\05_sigil.thoughtform\app\api\outputsid]\video-iterations\route.ts](c:\Users\buyss\Dropbox\03_Thoughtform\08_Artifacts\05_sigil.thoughtform\app\api\outputsid]\video-iterations\route.ts).
- Behavior:
  - Auth + project membership checks (same policy as generations/session APIs).
  - Resolve source output -> related generations created via `parameters.sourceOutputId` (or fallback `referenceImageId`).
  - Return ordered iteration list with status/model/outputs/createdAt for modal stack rendering.

### 5) Submit payload parity with Vesper flow

- Ensure modal submit calls existing `POST /api/generate` with payload including:
  - `sessionId`, `modelId`, `prompt`
  - `parameters`: `aspectRatio`, `resolution`, `numOutputs`, `duration`, `referenceImageUrl`, `sourceOutputId`, `referenceImageId`
- Ensure session creation path uses existing `POST /api/sessions` with `type: 'video'` and supports a `skipSwitch` behavior at UI level (no route change).

### 6) Wire trigger context from generation card

- Update [c:\Users\buyss\Dropbox\03_Thoughtform\08_Artifacts\05_sigil.thoughtform\components\generation\ForgeGenerationCard.tsx](c:\Users\buyss\Dropbox\03_Thoughtform\08_Artifacts\05_sigil.thoughtform\components\generation\ForgeGenerationCard.tsx) and related types so convert action passes enough context to modal:
  - `outputId` + `imageUrl` (+ optional metadata).
- Propagate through [c:\Users\buyss\Dropbox\03_Thoughtform\08_Artifacts\05_sigil.thoughtform\components\generation\ForgeGallery.tsx](c:\Users\buyss\Dropbox\03_Thoughtform\08_Artifacts\05_sigil.thoughtform\components\generation\ForgeGallery.tsx).

### 7) Styling pass (Sigil brand language)

- Add modal-specific styles in [c:\Users\buyss\Dropbox\03_Thoughtform\08_Artifacts\05_sigil.thoughtform\components\generation\ConvertToVideoModal.module.css](c:\Users\buyss\Dropbox\03_Thoughtform\08_Artifacts\05_sigil.thoughtform\components\generation\ConvertToVideoModal.module.css).
- Reuse tokenized primitives from [c:\Users\buyss\Dropbox\03_Thoughtform\08_Artifacts\05_sigil.thoughtform\app\globals.css](c:\Users\buyss\Dropbox\03_Thoughtform\08_Artifacts\05_sigil.thoughtform\app\globals.css) (`sigil-input`, `sigil-textarea`, buttons) and match current HUD/card visual language.

### 8) Validation and behavior checks

- Confirm no tab jump on convert action.
- Confirm generation starts successfully in selected/created video session.
- Confirm iteration stack updates for processing -> completed/failed.
- Confirm image/video model separation and no regressions in current image flow.

