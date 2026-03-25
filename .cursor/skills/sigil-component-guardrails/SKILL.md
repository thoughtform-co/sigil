---
name: sigil-component-guardrails
description: Guides new Sigil UI and API work toward scalable defaults without over-constraining bespoke surfaces. Use when adding or refactoring React components, cards, dashboard/journey/generation UI, shared TypeScript types, or app/api route handlers in this repo. Triggers on component, CardFrame, route.ts, lib/types, prefetch, or harmonization requests.
---

# Sigil component and layer guardrails

**Thoughtform visual / HUD doctrine** lives in the global Cursor skill **`thoughtform-design`** (`~/.cursor/skills/thoughtform-design/`). Sigil-specific file pointers: `references/products/sigil.md` in that skill. This repo skill covers **implementation defaults** (components, types, API auth) only.

## Defaults (prefer these first)

1. **Surfaces** — List tiles and framed content start from `components/ui/CardFrame.tsx` plus `components/ui/card/` atoms (`CardTitle`, `CardStats`, `CardDivider`, `CardArrowAction`, `OpenRouteLinkAffordance`). Dense journey rail: `components/ui/JourneyCardCompact.tsx`.
2. **Route/link cards** — Reuse `components/ui/cards/RouteSummaryCard.tsx` for “briefing” style route links (journeys list, projects list). The dashboard rail preview card (`components/dashboard/RouteCard.tsx`) is intentionally different (media-first).
3. **Tokens** — Prefer CSS variables from `app/globals.css` (`var(--space-*)`, `var(--dawn-*)`, `var(--gold)`, `var(--duration-base)`). Add missing tokens to `globals.css` instead of one-off hex in TSX when the value will repeat.
4. **Types** — Shared DTOs and API shapes live under `lib/types/`. Do not import `@/components/*` from `lib/**` (enforced by `tests/contracts/lib-import-boundary.test.ts`). Feature modules may re-export from `lib/types` for ergonomics (e.g. `components/generation/types.ts`).
5. **API routes** — Middleware does not authenticate `/api/*`. Every new `app/api/**/route.ts` must call `getAuthedUser()` or `requireAdmin()`, **or** be explicitly public and allowlisted in `tests/contracts/api-route-auth-coverage.test.ts`. Document intentional public routes in a short comment at the top of the handler.
6. **Icons** — Reuse `components/ui/icons/AdminActionIcons.tsx` for pencil/trash affordances instead of inlining duplicate SVGs.

## When to diverge (allowed)

- **Workshop / branded / hero / 3D** — Full custom layout, literals, or CSS modules when the moment is intentionally distinct (e.g. [`components/workshops/`](components/workshops/), [`components/home/HomeGlobeScene.tsx`](components/home/HomeGlobeScene.tsx)).
- **Complex generation UI** — [`components/generation/*.module.css`](components/generation/) may keep module-scoped layout; still anchor colors and motion to tokens where practical.
- **New primitive** — If the same layout repeats a third time, extract a small primitive with clear props rather than copying CardFrame recipes.

## Checklist before merging UI

- [ ] Uses `CardFrame` + card atoms **or** documents why not (with a one-line comment).
- [ ] No new `lib` → `components` imports.
- [ ] New API route has auth or is allowlisted in the contract test with a comment.

## More detail

- [reference.md](reference.md) — Layer diagram, terminology, security notes.
- [examples.md](examples.md) — Short patterns and anti-patterns.
