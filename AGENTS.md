# Sigil — Thoughtform

## Cursor Cloud specific instructions

### Overview

Sigil is a Next.js 16 (App Router) dual-mode creative platform. See `README.md` for architecture, data hierarchy, and design system details.

### Key commands

All standard dev commands are in `package.json` scripts:

| Command | Purpose |
|---------|---------|
| `npm run dev` | Next.js dev server on `:3000` |
| `npm test` | Vitest contract tests |
| `npm run lint` | ESLint (pre-existing warnings/errors in codebase) |
| `npm run build` | Production build |
| `npx prisma db push` | Sync Prisma schema to database |

### Auth bypass (local development only)

`SIGIL_AUTH_BYPASS=true` and `SIGIL_PUBLIC_DEMO=true` are honored **only when** `NODE_ENV === "development"` (see `middleware.ts` and `lib/auth/server.ts`). In that mode, Supabase auth is skipped and a local profile is upserted for the bypass user.

**Vercel production** always uses real Supabase sessions; those flags in the project env do not change production behavior. Match prod locally with `npm run build` + `npm start` or by unsetting bypass in dev.

### Database

The app uses a remote Supabase-hosted PostgreSQL database. `DATABASE_URL` and `DIRECT_URL` are injected as secrets. Run `npx prisma db push` only when the schema has changed — the postinstall hook already runs `prisma generate`.

### Gotchas

- The `postinstall` script runs `prisma generate` automatically on `npm install`. No separate step needed unless you change the schema.
- ESLint exits with code 1 due to pre-existing lint errors (mostly unused vars and React effect warnings). This is expected and not caused by agent changes.
- The Figma plugin in `packages/figma-plugin/` has its own `package.json` and is excluded from the root TypeScript config. It does not need to be built for the main app to work.
- All AI provider API keys (Gemini, Replicate, Anthropic, Kling, FAL) are optional — the app gracefully degrades when they are absent.

### Architecture and new work

- **Layers**: `lib/**` must not import `components/**`. Shared DTOs live in `lib/types/` (generation, dashboard, auth snapshots). Prefetch and server code import from there only.
- **API auth**: `middleware.ts` does **not** protect `/api/*`. Each `app/api/**/route.ts` must call `getAuthedUser()` or `requireAdmin()`, or be an intentional public endpoint. Public routes must be allowlisted in `tests/contracts/api-route-auth-coverage.test.ts` with a brief comment in the handler.
- **Production env**: `instrumentation.ts` runs `assertServerEnv()` when `NODE_ENV === "production"` so missing `DATABASE_URL` / Supabase URL keys fail fast.
- **Cursor skill**: For component and API conventions when adding UI, use the project skill at `.cursor/skills/sigil-component-guardrails/SKILL.md` (defaults + allowed exceptions).
