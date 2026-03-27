---
name: forge qol polish
overview: Plan a focused Forge quality-of-life pass that improves prompt persistence, card ergonomics, dismiss behavior, waypoint hover media, and generation loading/reveal aesthetics without changing the broader product architecture.
todos:
  - id: prompt-persistence
    content: Keep the Forge composer prompt intact after submit and preserve current shared-composer behavior for reuse/reference actions.
    status: completed
  - id: forge-card-geometry
    content: Increase prompt-panel breathing room and update coupled gallery skeleton/separator geometry to match.
    status: completed
  - id: dismiss-contract
    content: Align dismiss UI and DELETE API semantics so failed and clearly stalled generations can be removed reliably.
    status: completed
  - id: waypoint-hover-media
    content: Refactor waypoint hover cards so media fills the expanded frame with proportional cover and overlay controls.
    status: completed
  - id: sigil-loading-reveal
    content: Design and stage a lightweight sigil/particle processing animation plus late blur/noise reveal for final media.
    status: completed
  - id: validation-pass
    content: Verify prompt persistence, card alignment, dismiss flows, waypoint hover media, and loading/reveal performance across image and video cases.
    status: completed
isProject: false
---

# Forge QoL Features

## What This Changes

- Preserve prompt text after submit by removing the current reset in [components/generation/ProjectWorkspace.tsx](components/generation/ProjectWorkspace.tsx), where `submitGeneration()` currently ends with `setPrompt("")`.
- Give each Forge row more breathing room by widening the prompt column/panel in [components/generation/ForgeGenerationCard.module.css](components/generation/ForgeGenerationCard.module.css) and mirroring the same geometry in [components/generation/ForgeGallery.module.css](components/generation/ForgeGallery.module.css), which currently share `grid-template-columns: minmax(200px, 240px) minmax(0, 1fr)` and a separator offset of `left: 248px`.
- Align dismiss behavior with what the UI exposes by updating [app/api/generations/[id]/route.ts](app/api/generations/[id]/route.ts), which currently rejects anything not `failed`, and tightening the corresponding states in [components/generation/ForgeGenerationCard.tsx](components/generation/ForgeGenerationCard.tsx).
- Make hovered waypoints full-bleed by restructuring [components/hud/WaypointBranch.tsx](components/hud/WaypointBranch.tsx) so the media layer expands with the card instead of staying locked to `width: THUMB - 2` inside a wider hover frame.
- Upgrade the in-progress state in [components/generation/ForgeGenerationCard.tsx](components/generation/ForgeGenerationCard.tsx) from a pulsing diamond to a lightweight sigil/particle reveal that reuses existing Thoughtform assets from [components/ui/ParticleIcon.tsx](components/ui/ParticleIcon.tsx), [components/hud/SigilParticleLogo.tsx](components/hud/SigilParticleLogo.tsx), [components/dashboard/RouteCard.tsx](components/dashboard/RouteCard.tsx), and the local media-load pattern in [components/generation/ImageBrowseModal.tsx](components/generation/ImageBrowseModal.tsx).

## Implementation Notes

- Keep the composer single-source-of-truth in [components/generation/ProjectWorkspace.tsx](components/generation/ProjectWorkspace.tsx); the main change is to stop clearing it automatically, not to introduce per-card draft state.
- For the “use as reference” affordance in [components/generation/ForgeGenerationCard.tsx](components/generation/ForgeGenerationCard.tsx), replace the inline SVG with a rotated particle-arrow or equivalent down-left/downward transfer icon so it visually points back toward the prompt/reference strip.
- For stalled-generation dismissal, prefer server-side rules based on status plus staleness/heartbeat rather than only client heuristics, so the UI action and API contract stay consistent.
- For the loading animation, use SVG/CSS or a tiny seeded canvas only on active processing cards. Avoid per-card WebGL; [components/generation/ForgeGallery.tsx](components/generation/ForgeGallery.tsx) only virtualizes after 20 rows.
- Consider expanding [hooks/useGenerationsRealtime.ts](hooks/useGenerationsRealtime.ts) to preserve `lastHeartbeatAt`, `source`, and `error*` fields so stuck-state UI and reveal timing stay closer to the richer payload already returned by [app/api/generations/route.ts](app/api/generations/route.ts).
- Keep motion within the Thoughtform system: fast UI transitions, ambient particle motion only, and a reduced-motion fallback.

## Validation

- Prompt persists after Generate, Enter-submit, Reuse, and Use as reference flows.
- Prompt-panel resizing stays aligned with skeleton rows, separators, and the mobile stacked layout.
- Failed and stalled generations can both be removed when the UI offers Dismiss, with SWR cache updating immediately.
- Waypoint hover shows cover-scaled media across the entire expanded frame for both image and video thumbnails.
- Processing cards transition from sigil/particle placeholder to final media via blur/noise fade without causing gallery jank.

