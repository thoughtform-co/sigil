---
name: animate-still modal end-frame
overview: Make Sigil’s ConvertToVideoModal match Vesper’s animate-still overlay layout (controls always visible) and make end-frame interpolation actually work end-to-end (upload → generation params → adapters/providers).
todos:
  - id: ui-frame-cap
    content: Cap start frame preview height (16:9 container + object-contain) and inline session header in ConvertToVideoModal CSS/TSX
    status: completed
  - id: ui-endframe-upload
    content: Upload end frame via /api/upload/reference-image and store endFrameImageUrl in generation parameters
    status: completed
  - id: process-nested-parameters
    content: "Include parameters: params in /api/generate/process requestPayload so adapters can read request.parameters"
    status: completed
  - id: replicate-endframe
    content: Support endFrameImageUrl (end_image) + duration/audio reads in ReplicateAdapter video path
    status: completed
  - id: kling-official-adapter
    content: Implement official Kling adapter (JWT auth, image2video submit/poll, image_tail end frame, sound-off constraint) without adding dependencies
    status: completed
  - id: veo-adapter
    content: Implement Veo 3.1 generateVideo in GeminiAdapter with optional end-frame (lastFrame) using Vesper logic
    status: completed
  - id: storage-gs-uri
    content: Extend uploadProviderOutput to handle gs:// URIs (and headers if needed) so Veo outputs persist
    status: completed
isProject: false
---

# Fix Animate-Still Modal + End-Frame Interpolation

## Goal

- Make the modal **layout behave like Vesper**: start frame is capped in a 16:9 container (`object-contain`) so the **session + prompt + model row are always visible**.
- Make **end-frame interpolation functional** (not just UI): upload end frame to storage, persist URL in generation params, and pass it through adapters to providers that support it.

## What was missing (sanity check)

- In Sigil, `.frameCard/.frameImg` currently has **no height cap**, so large/portrait images push the entire form below the fold while scrollbars are hidden.
  - File: [components/generation/ConvertToVideoModal.module.css](components/generation/ConvertToVideoModal.module.css)
- In Vesper, the preview is always constrained (left panel uses `aspect-video` + `object-contain`).
  - File: [src/components/generation/ImageToVideoOverlay.tsx](../07_vesper.loop/Loop-Vesper/src/components/generation/ImageToVideoOverlay.tsx)

## Plan

### UI: match Vesper layout + upload end frame

- Update [components/generation/ConvertToVideoModal.module.css](components/generation/ConvertToVideoModal.module.css)
  - Add `aspect-ratio: 16 / 9`, `overflow: hidden`, and move border/background to `.frameCard`.
  - Set `.frameImg` to `height: 100%` and `object-fit: contain`.
- Update [components/generation/ConvertToVideoModal.tsx](components/generation/ConvertToVideoModal.tsx)
  - Add a `.sessionHeader` row so **“Target video session” + Existing/+New toggle** are inline (Vesper-like).
  - Change end-frame selection flow:
    - On file pick, upload via existing endpoint [app/api/upload/reference-image/route.ts](app/api/upload/reference-image/route.ts) using `multipart/form-data`.
    - Store the returned stable URL in state (so `handleSubmit` naturally sends `parameters.endFrameImageUrl`).
    - Keep a fallback path (base64) only if upload fails.

### Server: ensure adapters receive a nested `parameters` object

- Update [app/api/generate/process/route.ts](app/api/generate/process/route.ts)
  - Keep the current `...params` behavior for backward compatibility.
  - Also include `parameters: params` in `requestPayload` so adapters can reliably read `request.parameters.`* (matches Vesper adapter expectations and fixes Replicate duration/end-frame reads).

### Adapters: wire end-frame to providers

- Update Replicate Kling path in [lib/models/adapters/replicate.ts](lib/models/adapters/replicate.ts)
  - Read `duration`, `generateAudio`, and `**endFrameImageUrl`** from `request.parameters` (and/or top-level fallback).
  - If present, send `end_image` to Replicate Kling input (Vesper does this).
- Replace the current Kling-official stub in [lib/models/adapters/kling.ts](lib/models/adapters/kling.ts)
  - Implement the official Kling API flow (port the behavior from Vesper’s [src/lib/models/adapters/kling.ts](../07_vesper.loop/Loop-Vesper/src/lib/models/adapters/kling.ts)):
    - JWT auth from `KLING_ACCESS_KEY` + `KLING_SECRET_KEY` (implement HS256 signing via Node `crypto` to avoid adding deps).
    - `POST https://api.klingai.com/v1/videos/image2video`
    - Poll `GET https://api.klingai.com/v1/videos/image2video?task_id=...`
    - Map start frame from `referenceImageUrl`, end frame from `parameters.endFrameImageUrl` → `image_tail`.
    - If end frame is set, force `sound: off` (matches Vesper’s runtime constraint).
- Implement real Veo 3.1 generation in [lib/models/adapters/gemini.ts](lib/models/adapters/gemini.ts)
  - Port Vesper’s Veo implementation from [src/lib/models/adapters/gemini.ts](../07_vesper.loop/Loop-Vesper/src/lib/models/adapters/gemini.ts): `predictLongRunning`, poll operation, return `generatedVideo.video.uri`.
  - Add end-frame support (`parameters.lastFrame`) using `parameters.endFrameImageUrl`.

### Storage: ensure Veo outputs can be downloaded

- Update [lib/supabase/storage.ts](lib/supabase/storage.ts)
  - Extend `uploadProviderOutput()` to support `gs://...` URIs (convert to `https://storage.googleapis.com/...`) similar to Vesper’s `uploadUrlToStorage`.
  - If Veo returns a non-public URL that needs auth, add an option to pass fetch headers (e.g. `x-goog-api-key`).

## Test plan

- Open Convert-to-video modal on a portrait/square image and confirm:
  - Start frame is letterboxed inside a 16:9 container.
  - Session picker, prompt, model picker, and generate button are visible without “mystery scrolling”.
- Pick an end frame and confirm it uploads to a stable URL (no base64 payload).
- Generate with `kling-official` and confirm request includes end frame and succeeds.
- Generate with `kling-2.6` (Replicate) and confirm end-frame is either respected (if model supports) or UI correctly hides it.
- If `GEMINI_API_KEY` is configured, generate with `veo-3.1` and confirm the returned URI is persisted to outputs (including gs:// handling).

