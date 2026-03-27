---
name: waypoint media recency
overview: Add explicit video start/end frame handling in the Waypoint prompt bar, page-wide clipboard image ingestion for image/video sessions, and reorder journeys by latest generation activity.
todos:
  - id: video-frame-state
    content: Split video prompt-bar state into explicit start/end frame handling and update ForgePromptBar UI/CSS accordingly.
    status: completed
  - id: end-frame-pipeline
    content: Persist and hydrate end-frame URLs in ProjectWorkspace, reference-image helpers, and generate/rerun routes.
    status: completed
  - id: workspace-paste
    content: Add document-level clipboard image routing for image references and video start/end frames.
    status: completed
  - id: journey-activity-sort
    content: Reorder journeys by latest generation activity in dashboard and journeys prefetch helpers.
    status: completed
isProject: false
---

# Waypoint Media And Journey Recency

## Decisions

- "Used last" means the Journey with the most recent generation activity across any of its routes.
- Clipboard support will be document-level paste handling inside the route workspace, so it works anywhere on the page instead of only when the prompt bar is focused.
- In video mode, the first pasted/uploaded image fills the start frame and the next one fills the end frame. If both slots are already filled, the newest pasted image will replace the end frame.
- No Prisma migration is required: journey recency can be derived from existing `Generation.createdAt`, and frame metadata can continue to live inside `Generation.parameters`.

## Key Touchpoints

- `[components/generation/ForgePromptBar.tsx](components/generation/ForgePromptBar.tsx)`: the current attach row is a flat `referenceImages[]` strip with the empty-state text `"or paste URL"`. This is where the video-specific start/end frame affordance needs to replace the generic row.
- `[components/generation/ProjectWorkspace.tsx](components/generation/ProjectWorkspace.tsx)`: owns prompt bar state, uploads reference images in `submitGeneration()`, seeds video refs from the `ref` query param, and restores old parameters in `reuseGeneration()`.
- `[components/generation/ConvertToVideoModal.tsx](components/generation/ConvertToVideoModal.tsx)`: already has the closest Sigil-native start/end frame interaction model to mirror for the main video tab.
- `[lib/reference-images.ts](lib/reference-images.ts)`, `[app/api/generate/route.ts](app/api/generate/route.ts)`, and `[app/api/generations/[id]/rerun/route.ts](app/api/generations/[id]/rerun/route.ts)`: currently hydrate signed URLs for reference/start images, but not for end-frame URLs.
- `[lib/prefetch/dashboard.ts](lib/prefetch/dashboard.ts)` and `[lib/prefetch/journeys.ts](lib/prefetch/journeys.ts)`: both still sort journeys by `workspace_projects.updated_at DESC`, which does not reflect actual usage.

## Work Plan

- Update `[components/generation/types.ts](components/generation/types.ts)` and the prompt-bar state in `[components/generation/ProjectWorkspace.tsx](components/generation/ProjectWorkspace.tsx)` so video mode has explicit frame semantics instead of only a generic `referenceImages[]` list. Keep image mode unchanged as multi-reference input.
- Rework the video attach UI in `[components/generation/ForgePromptBar.tsx](components/generation/ForgePromptBar.tsx)` and `[components/generation/ForgePromptBar.module.css](components/generation/ForgePromptBar.module.css)` to render a start-frame slot plus a conditional end-frame slot/button, borrowing the interaction pattern from `[components/generation/ConvertToVideoModal.tsx](components/generation/ConvertToVideoModal.tsx)` and gating the end-frame affordance off video-model capabilities.
- Extend `[components/generation/ProjectWorkspace.tsx](components/generation/ProjectWorkspace.tsx)` so `submitGeneration()` uploads/persists end-frame blobs through the existing `[app/api/upload/reference-image/route.ts](app/api/upload/reference-image/route.ts)` endpoint and sends `parameters.endFrameImageUrl` plus matching storage metadata alongside the existing start/reference fields. Update `reuseGeneration()` so prior video generations repopulate both slots.
- Extend `[lib/reference-images.ts](lib/reference-images.ts)` so signed-URL refresh covers end-frame URLs and paths, then rely on that from `[app/api/generate/route.ts](app/api/generate/route.ts)` and `[app/api/generations/[id]/rerun/route.ts](app/api/generations/[id]/rerun/route.ts)` so queued runs, reruns, and expired links keep working.
- Add page-wide clipboard image ingestion in `[components/generation/ProjectWorkspace.tsx](components/generation/ProjectWorkspace.tsx)` or a small extracted hook under `hooks/`, using a document-level paste listener that only intercepts `image/*` clipboard items. Route image-mode pastes to `referenceImages[]`, route the first video paste to the start frame, and route the next one to the end frame without requiring prompt-bar focus.
- Replace the `updatedAt`-only sort in `[lib/prefetch/dashboard.ts](lib/prefetch/dashboard.ts)` with a latest-generation-activity sort joined through `projects -> sessions -> generations`, with `workspace_projects.updated_at` as the fallback for journeys with no activity. Mirror the same ordering in `[lib/prefetch/journeys.ts](lib/prefetch/journeys.ts)` so the alternate journeys list stays consistent.

## Verification

- Confirm that uploading or browsing a start frame on the video tab reveals an end-frame upload/browse control in the same row.
- Confirm that pasting an image while focus is in the gallery, session rail, or elsewhere in the workspace still attaches it to the active image/video session.
- Confirm that reusing or rerunning a video generation with an end frame preserves both frame URLs.
- Confirm that generating inside an older Journey moves that Journey to the top of `/journeys` after SSR load and SWR refresh.

