---
name: performance-debrief-sentinel
overview: Produce a detailed postmortem debrief of the performance fix journey, update the Loop-Vesper `.sentinel.md` with reusable high-level patterns/vulnerabilities, and add a forward-looking stability/performance roadmap for multi-user scale.
todos:
  - id: draft-debrief
    content: Draft detailed postmortem narrative linking attempted refactors vs evidence-backed winning fixes.
    status: completed
  - id: extend-sentinel-patterns
    content: Add new sentinel sections for postmortem patterns, vulnerabilities, and guardrails.
    status: completed
  - id: add-scale-roadmap
    content: Append prioritized next-step roadmap for multi-user stability and performance.
    status: completed
  - id: align-react-guidance
    content: Align frontend recommendations with React best-practice categories and anti-waterfall principles.
    status: completed
  - id: final-quality-pass
    content: Ensure clarity, portability, and actionability of the updated sentinel document.
    status: completed
isProject: false
---

# Performance Debrief and Sentinel Update Plan

## Goal

Create a high-signal debrief that explains what finally solved the loading crisis, preserve those lessons in a durable sentinel guide, and define practical next steps for scale.

## Source Inputs

- Master performance context from [c:\Users\buyss\Manifold Delta\Artifacts\05_sigil.thoughtform\docs\performance\PERFORMANCE_PLAN.md](c:\Users\buyss\Manifold%20Delta\Artifacts\05_sigil.thoughtform\docs\performance\PERFORMANCE_PLAN.md)
- Audit framing from [c:\Users\buyss\Manifold Delta\Artifacts\05_sigil.thoughtformcursor\plans\performance-pattern-audit_e7e9df44.plan.md](c:\Users\buyss\Manifold%20Delta\Artifacts\05_sigil.thoughtform.cursor\plans\performance-pattern-audit_e7e9df44.plan.md)
- Production root-cause notes from [c:\Users\buyss\Manifold Delta\Artifacts\05_sigil.thoughtformcursor\plans\fix-production-load-times_f65cb956.plan.md](c:\Users\buyss\Manifold%20Delta\Artifacts\05_sigil.thoughtform.cursor\plans\fix-production-load-times_f65cb956.plan.md)
- Existing sentinel baseline from [c:\Users\buyss\Manifold Delta\Artifacts\07_vesper.loop\Loop-Vespersentinel.md](c:\Users\buyss\Manifold%20Delta\Artifacts\07_vesper.loop\Loop-Vesper.sentinel.md)
- React best-practice reference from [https://github.com/vercel-labs/agent-skills/tree/main/skills/react-best-practices](https://github.com/vercel-labs/agent-skills/tree/main/skills/react-best-practices)

## Deliverable 1: Debrief/Analysis (Narrative)

Write a structured debrief that covers:

- Timeline of attempts: plan-driven refactors, what hardened architecture, and what failed to move latency.
- Why many changes underperformed: optimization across too many layers without single acceptance gates.
- The decisive evidence: runtime measurements identifying network RTT, serial query chains, duplicate revalidation, and oversized media payloads.
- The winning fixes and why they worked:
  - compute/data co-location (`vercel.json` region)
  - removing blocking thumbnail/data URI paths from critical render
  - slimming server prefetch and deferring hydration
  - preserving security/hardening gains from earlier refactors
- Portable lessons: how to avoid future “churn loops” and verify with evidence first.

## Deliverable 2: Update `.sentinel.md`

Update [c:\Users\buyss\Manifold Delta\Artifacts\07_vesper.loop\Loop-Vespersentinel.md](c:\Users\buyss\Manifold%20Delta\Artifacts\07_vesper.loop\Loop-Vesper.sentinel.md) with new high-level sections:

- **Performance Postmortem Patterns**
  - Latency amplification pattern (small SQL + large RTT + serial calls)
  - Dual-fetch/hydration mismatch pattern
  - Payload toxicity pattern (`data:` URIs / oversized blobs in critical paths)
  - Instrument-first debugging pattern
- **System Vulnerabilities to Watch**
  - Cross-region drift between app compute and primary data stores
  - Hidden fan-out from auth + layout + page + SWR in same navigation
  - Unbounded list/admin endpoints and aggregation in app code
  - Non-idempotent background jobs under concurrency
- **Guardrails (Scale-Ready)**
  - Route budgets (TTFB, p95, query count, payload limits)
  - “single owner per fetch” contract per page surface
  - no-inline-large-media in SSR/API contracts
  - required measurement before/after for performance PRs

## Deliverable 3: Next-Step Recommendations (Multi-user Stability)

Add a prioritized roadmap block (0-2 weeks, 2-6 weeks, 6+ weeks):

- **Immediate reliability/perf controls**
  - SLOs + alerting (p95 latency, error rate, queue lag)
  - request tracing with correlation IDs across middleware/api/db
  - enforce pagination and bounded queries on admin/analytics paths
- **Concurrency and pipeline hardening**
  - idempotency keys + atomic job claiming
  - queue-based generation pipeline with retry policies and dead-letter handling
  - backpressure limits per user/project/model
- **Data and rendering architecture**
  - split critical path data from heavy media metadata
  - async thumbnail/materialization jobs + CDN derivatives
  - cache strategy by surface (edge/private short TTL/object cache)
- **Frontend best-practice alignment (React/Next)**
  - eliminate waterfalls (parallel fetches, clear ownership boundaries)
  - control re-render pressure and SWR invalidation scopes
  - explicit suspense/loading boundaries for perceived performance
  - strict SSR/client contract for fallbackData and revalidation policy
- **Operational maturity**
  - synthetic probes for key flows (dashboard -> journey -> route)
  - load tests for multi-tenant peak behavior
  - performance regression checklist in CI/review templates

## Output Shape

- Keep the sentinel additions principle-driven and reusable (not tied to one incident’s IDs).
- Include a concise “What finally moved the needle” summary block for leadership-level readability.
- Keep recommendations specific enough to schedule as engineering tasks.

