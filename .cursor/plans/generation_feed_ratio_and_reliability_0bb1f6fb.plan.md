---
name: generation_feed_ratio_and_reliability
overview: Fix generation card rendering/spacing behavior, add reliable bottom auto-scroll, keep single `outputs` bucket strategy, and harden processing so jobs cannot stay stuck without surfacing failure.
todos:
  - id: card-ratio-corners
    content: Fix media ratio rendering and visible corners for completed/processing/failed generation cards
    status: completed
  - id: feed-spacing-autoscroll
    content: Increase feed spacing and implement bottom auto-scroll-on-new-generation without hiding behind prompt bar
    status: completed
  - id: process-failsafe
    content: Add top-level process-route fail-safe so stuck processing transitions to failed with broadcast
    status: completed
  - id: single-bucket-guardrails
    content: Keep and document single outputs bucket path conventions for image/video writes
    status: completed
  - id: verify-end-to-end
    content: Run generation scenarios to validate ratio, corners, feed position, storage bucket usage, and stuck-job recovery
    status: completed
isProject: false
---

