---
name: Sigil workshop launch prep
overview: "Comprehensive prep for tomorrow's workshop: magic link auth with runic rain login, security hardening (email allowlist, middleware, API protection), DNS setup for sigil.thoughtform.co, admin panel for managing approved emails, and UI redesign (centered nav bar, bottom-anchored feed, refined prompt panel)."
todos:
  - id: runic-rain
    content: Create `components/ui/RunicRain.tsx` -- Elder Futhark rune particle rain in gold palette
    status: completed
  - id: login-page
    content: Rewrite `app/login/page.tsx` -- magic link OTP, runic rain background, glass card
    status: completed
  - id: auth-callback
    content: Create `app/auth/callback/route.ts` -- PKCE + token-hash magic link handling
    status: completed
  - id: middleware
    content: Create `middleware.ts` -- route protection, session refresh, dev bypass
    status: completed
  - id: fix-api-auth
    content: Add auth checks to `api/generate/process` and `api/models`
    status: completed
  - id: harden-bypass
    content: Gate SIGIL_AUTH_BYPASS on NODE_ENV=development in `lib/auth/server.ts`
    status: completed
  - id: email-allowlist-schema
    content: Add `AllowedEmail` model to Prisma schema + migrate
    status: completed
  - id: email-allowlist-api
    content: Create `/api/auth/check-email` + `/api/admin/allowed-emails` routes
    status: completed
  - id: email-allowlist-gate
    content: Gate magic link sending on allowlist check in login page
    status: completed
  - id: admin-emails-ui
    content: Add allowed emails management section to admin page
    status: completed
  - id: delete-signup
    content: Remove `app/signup/page.tsx`
    status: completed
  - id: nav-redesign
    content: Redesign NavigationFrame -- centered sigil symbol, left/right nav groups
    status: completed
  - id: feed-layout
    content: "Bottom-anchor the feed in ForgeGallery (justify-content: flex-end)"
    status: completed
  - id: prompt-panel
    content: Restyle prompt panel -- transparent bg, dividers, gold label badges
    status: completed
  - id: dns-instructions
    content: Provide DNS setup instructions for sigil.thoughtform.co on GoDaddy + Vercel
    status: completed
isProject: false
---

# Sigil Workshop Launch Prep

## A. Authentication -- Magic Link with Runic Rain

### A1. Create `RunicRain` particle system

**New file:** `[components/ui/RunicRain.tsx](components/ui/RunicRain.tsx)`

Adapted from Babylon's `[CuneiformRain.tsx](c:\Users\buyss\Dropbox\03_Thoughtform\08_Artifacts\10_Babylon\src\components\ui\CuneiformRain.tsx)`. Same canvas architecture (column-based falling glyphs, DPR-aware, sub-pixel movement, requestAnimationFrame loop) with Sigil theming:

- **Glyphs**: Elder Futhark runes (U+16A0-U+16DF): `\u16A0` (fehu), `\u16A2` (thurisaz), `\u16A6` (ansuz), `\u16B1` (sowilo), etc., plus select occult symbols
- **Color**: Gold palette -- head glyph `hsla(43, 55%, 72%, 0.5)` with `shadowBlur: 14`, trail fading from alpha `0.2` to `0.03`
- **Background**: `#050403` (--void)

### A2. Rewrite login page (magic link only)

**Edit:** `[app/login/page.tsx](app/login/page.tsx)`

Convert to `"use client"` component. Drop `NavigationFrame` wrapper. Structure:

- Full-screen `RunicRain` background
- Radial vignette overlay (`radial-gradient(... transparent 30%, #050403cc 100%)`)
- Centered glass card using Sigil tokens (bg: `--surface-0` at 75% opacity, border: `--dawn-15`, `backdrop-filter: blur(20px)`, gold corner accents from existing `AuthForm`)
- Branding: "SIGIL" in `--font-mono` + "Generation Platform" subtitle
- Single email field, "Send Magic Link" button calling `supabase.auth.signInWithOtp()`
- Three states: form / sent (check-your-email confirmation) / error
- On submit, first validates email against allowlist via `POST /api/auth/check-email`

### A3. Auth callback route

**New file:** `[app/auth/callback/route.ts](app/auth/callback/route.ts)`

Adapted from Babylon. Handles:

- PKCE flow: `exchangeCodeForSession(code)`
- Token-hash flow: `verifyOtp({ token_hash, type })`
- Success -> redirect `/projects`
- Failure -> redirect `/login?error=auth`

### A4. Delete signup page

**Delete:** `[app/signup/page.tsx](app/signup/page.tsx)` -- magic link handles both sign-up and sign-in.

---

## B. Security Hardening

### B1. Middleware for route protection

**New file:** `[middleware.ts](middleware.ts)`

Adapted from Babylon's middleware with Sigil-specific paths:

- **Public paths**: `/login`, `/auth/`*, `/api/auth/`*, `/api/public/*`
- Authenticated user on `/login` -> redirect to `/projects`
- Unauthenticated user on any other path -> redirect to `/login`
- Unauthenticated API requests -> 401
- Supabase session refresh on every request
- Respect `SIGIL_AUTH_BYPASS` for local dev only (`NODE_ENV === "development"`)

### B2. Fix unprotected API routes

- `[app/api/generate/process/route.ts](app/api/generate/process/route.ts)`: Add `getAuthedUser()` check at start of handler
- `[app/api/models/route.ts](app/api/models/route.ts)`: Add `getAuthedUser()` check (this should be protected for a closed platform)

### B3. Disable auth bypass in production

- **Edit:** `[lib/auth/server.ts](lib/auth/server.ts)`: Gate bypass on `NODE_ENV === "development"` in addition to the env flag
- **Edit:** `[.env](.env)`: Add comment warning that bypass flags must be `false` in production
- Vercel env vars should NOT include `SIGIL_AUTH_BYPASS` or `NEXT_PUBLIC_SIGIL_AUTH_BYPASS`

### B4. Email allowlist

**New Prisma model** in `[prisma/schema.prisma](prisma/schema.prisma)`:

```prisma
model AllowedEmail {
  id        String   @id @default(uuid()) @db.Uuid
  email     String   @unique
  note      String?
  addedBy   String   @map("added_by") @db.Uuid
  createdAt DateTime @default(now()) @map("created_at")

  @@map("allowed_emails")
}
```

**New API route:** `app/api/auth/check-email/route.ts`

- POST with `{ email }` -> checks if email exists in `allowed_emails` table
- Returns `{ allowed: true/false }`
- Called from login page before sending OTP; if not allowed, show "Contact admin for access"

**New admin API routes:**

- `app/api/admin/allowed-emails/route.ts` -- GET (list) and POST (add)
- `app/api/admin/allowed-emails/[id]/route.ts` -- DELETE (remove)
- All require admin auth

Run `npx prisma migrate dev` after schema change.

---

## C. DNS -- sigil.thoughtform.co

This is a manual configuration step (no code changes):

1. **Vercel**: Go to project settings -> Domains -> Add `sigil.thoughtform.co`
2. **GoDaddy**: Add a CNAME record:
  - Host: `sigil`
  - Points to: `cname.vercel-dns.com`
  - TTL: 600 (or default)
3. Vercel will auto-provision SSL once DNS propagates (usually < 5 min)
4. Update Supabase Auth settings: add `https://sigil.thoughtform.co` as a redirect URL in Supabase Dashboard -> Authentication -> URL Configuration

---

## D. Admin Panel -- Manage Approved Emails

### D1. Add "Allowed Emails" section to existing admin page

**Edit:** `[app/admin/page.tsx](app/admin/page.tsx)`

Add a new section to the existing admin panel:

- Table listing all allowed emails (email, note, date added)
- "Add Email" form (email + optional note)
- Delete button per row
- Uses the admin API routes from B4

### D2. Settings/API key management (optional stretch)

If time permits, add a section to display which API keys are configured (not the values, just status like "Configured" / "Missing") by checking env vars server-side. This is read-only and informational -- actual key changes happen through Vercel env vars.

---

## E. UI Redesign

### E1. Navigation bar -- centered Sigil symbol

**Edit:** `[components/hud/NavigationFrame.tsx](components/hud/NavigationFrame.tsx)`

Replace the current top header bar (workspace mode) with a centered horizontal nav:

```
[PROJECTS] [BRIEFINGS] [REVIEW]  { Sigil Symbol }  [BOOKMARKS] [SETTINGS]
```

- Center: animated Sigil glyph (a single rune or small particle burst as an SVG/canvas element). Clickable, links to `/projects` (home).
- Left of center: `projects`, `briefings`, `review`
- Right of center: `bookmarks`, `settings` (settings links to `/admin` or a new settings page)
- Remove the old project name/path display from top-right corner (currently showing project id and image/video mode)
- Same nav for both dashboard and workspace modes (remove the `showNavPanel` split -- use a single horizontal nav across all pages)
- Keep the left/right tick rails

Design: fixed top bar, mono font, `--dawn-40` inactive, `--gold` active, clean horizontal layout with subtle separator dots or thin dividers between left group, symbol, right group.

### E2. Feed layout -- bottom-anchored, grow upward

**Edit:** `[components/generation/ForgeGallery.module.css](components/generation/ForgeGallery.module.css)`

Change the feed to anchor content at the bottom:

```css
.feed {
  display: flex;
  flex-direction: column-reverse;  /* or use justify-content: flex-end with column */
  /* ... keep existing gap, max-width, scrollbar hiding */
}
```

Actually, the cleanest approach: keep `flex-direction: column` but add `justify-content: flex-end` so content sits at the bottom when there are few items, and naturally scrolls when there are many. Adjust the auto-scroll logic in `[ForgeGallery.tsx](components/generation/ForgeGallery.tsx)` accordingly (scroll to bottom is already the behavior, just the visual anchoring changes).

Also adjust the padding: currently has `padding-bottom: 260px` (for prompt bar clearance) -- keep that. Change `padding-top` to be generous so early items don't hit the nav bar.

### E3. Prompt panel -- subtle dividers, gold label badges

**Edit:** `[components/generation/ForgeGenerationCard.module.css](components/generation/ForgeGenerationCard.module.css)` and `[ForgeGenerationCard.tsx](components/generation/ForgeGenerationCard.tsx)`

Current state: `.promptPanel` has a solid `--surface-0` background with `--dawn-08` border and a gold accent bar on the left.

New design (inspired by FUI game HUDs):

- Remove the solid background and border from `.promptPanel` -- make it transparent
- Add horizontal `1px solid var(--dawn-08)` dividers between the prompt text and meta readouts, and between meta readouts and actions
- Give `.readoutLabel` (ID, MODEL, DATE, STATUS) a gold-tinted badge:

```css
.readoutLabel {
  display: inline-block;
  padding: 1px 4px;
  background: var(--gold-10);
  border: 1px solid var(--gold-30);
  color: var(--gold);
  margin-right: 6px;
}
```

This matches the existing `.canvasBadge` styling, creating a consistent FUI readout look where each metadata label is clearly framed in gold.