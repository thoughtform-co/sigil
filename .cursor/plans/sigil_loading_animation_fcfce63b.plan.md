---
name: sigil loading animation
overview: Rewrite SigilLoadingField to fill the entire processing placeholder frame with a progress-driven radial expansion, leave clear space for the phase text, and use model-aware duration estimates so the animation roughly tracks expected generation time.
todos:
  - id: rewrite-sigil-field
    content: Rewrite SigilLoadingField with duration estimation, progress-driven radial expansion, text safe zone, and denser particle count.
    status: completed
  - id: integrate-card
    content: Update ForgeGenerationCard to pass createdAt/modelId props and position the canvas behind the text layer.
    status: completed
  - id: verify-visual
    content: Verify the animation fills the frame, text is readable, and progress roughly tracks image vs video generation times.
    status: completed
isProject: false
---

