---
name: stuck-generation-reliability
overview: "Implement full stuck-generation reliability and explicit failure messaging: heartbeat tracking, stale-job cleanup, structured error context, UI stuck-state messaging, and admin recovery tooling with Prisma migration support."
todos:
  - id: schema-fields
    content: Add Prisma fields for heartbeat and explicit generation error metadata; run migration
    status: completed
  - id: error-classifier
    content: Implement shared error classification utility with user-facing messages and retryability
    status: completed
  - id: process-heartbeat
    content: Add heartbeat updates and guaranteed failed-state persistence in process route
    status: completed
  - id: enqueue-retry
    content: Harden processor enqueue with logging and bounded retry/backoff
    status: completed
  - id: stale-cleanup-api
    content: Add admin cleanup endpoint to fail stale processing jobs with timeout reason
    status: completed
  - id: ui-explicit-errors
    content: Expose error/heartbeat fields in generation APIs and show explicit failed/stuck states in UI
    status: completed
  - id: admin-recovery
    content: Enhance admin failed/stuck tooling with reasons and retry actions
    status: completed
  - id: verify-flow
    content: Run lint/runtime verification and test provider outage/stuck recovery scenarios
    status: completed
isProject: false
---

