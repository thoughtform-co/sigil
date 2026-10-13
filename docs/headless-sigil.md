# Headless Sigil: the MCP server

Sigil can be used from Claude without opening the web app and without anyone holding a provider
key. A person adds one URL to Claude as a connector, signs in with their Sigil login, and Claude
draws images and makes videos through Sigil. Gemini, OpenAI, Replicate and Kling keys stay in
Sigil's own environment; nothing a caller receives can be used anywhere but here.

Ported from Vesper's headless surface (`tensalir/Loop-Vesper`, `docs/headless-vesper.md`) and cut
down: tools only, and the per-person sign-in as the only way in. There are no static API tokens.

```
Claude (chat, Desktop, Cowork, Claude Code)
   │  https://<sigil-host>/api/mcp        one URL, no key
   ▼
sign-in (OAuth 2.1, the person's own Sigil login) ──► a one-hour token for this server only
   ▼
tools ──► the same generation worker as the web app ──► provider keys in Sigil's environment
```

## Connecting

- **Claude chat, Desktop, Cowork:** Settings → Connectors → Add custom connector, URL
  `https://<sigil-host>/api/mcp`. Click Connect, sign in to Sigil, click Allow.
- **Claude Code:** `claude mcp add --transport http sigil https://<sigil-host>/api/mcp`, then
  `/mcp` and authenticate. A plugin can ship the same server in its `.mcp.json`.

Image calls can take close to a minute; a client with a 60-second tool timeout should raise it to
120 seconds. A slower draw, and every video, returns a `generationId` to collect.

## Tools

| Tool | What it does |
|---|---|
| `generate_image` | One to four images from a prompt, optionally with references. Answers inline with links and JPEG previews Claude can read. |
| `generate_video` | One clip from a prompt, optionally from a start image. Returns a `generationId`. |
| `get_generation_status` | Collects a draw started earlier. Only the caller's own draws made through Claude. |
| `create_upload_urls` | One upload URL per reference image on the person's disk; the returned `ref` goes into `references` or `startImage`. |
| `list_models` | The models and the aspect ratios each takes. |

Every draw is a normal `Generation` row with `source = "mcp"`, in the person's own project
"Claude", so it also shows up in the web app.

## The model that was asked for, or a plain failure

In the web app a Gemini draw that fails switches quietly to a backup model on Replicate. Through
Claude it does not: every draw is sent with `allowFallback: false`, so the picture comes from the
model that was asked for, or the tool says in words that it failed. References go to Gemini
before the prompt (`referencesFirst`); the web app keeps prompt first. Sigil adds nothing to a
prompt on this path: no enhancement, no system prompt.

A draw still running after eight minutes was cut off with its function. `get_generation_status`
then marks it failed, says so, and it stops counting against the allowance.

Video models: `veo-3.1` (default), `kling-3` (3 to 15 seconds, 720p to 4K, start and end frame),
`seedance-2.5`, `kling-2.6`, `kling-official`. A long or high-resolution clip can run past the
300 seconds a function gets; keep clips short until long renders are collected in the background.

## Who may connect

Anyone with an active Sigil account: being on the access list is the gate. An admin can turn
Claude access off per person (Admin → Users, column **Claude**), which stops that person's next
call. Disabling the account does the same.

## Spend

A daily allowance per person, per rolling 24 hours, counted from their `mcp` generations. Admins
are not limited. A refusal says how many were used and when the next one frees up.

## Settings

| Name | What |
|---|---|
| `MCP_OAUTH_SECRET` | Required, 32+ characters (`openssl rand -hex 32`). Signs client ids and pending sign-ins. Without it the connector answers 503. |
| `MCP_OAUTH_ENABLED` | `0` switches the sign-in off. |
| `MCP_DAILY_IMAGES` | Images per person per 24 hours. Default 60. |
| `MCP_DAILY_VIDEOS` | Videos per person per 24 hours. Default 4. |
| `MCP_RESOURCE_ALIASES` | Other URLs this server answers to, comma-separated (a second domain in front of the same app). |
| `MCP_OAUTH_REDIRECT_ALLOWLIST` | Extra redirect URIs, exact match. Claude's callbacks and loopback addresses are built in. |

## Deploying it the first time

1. Apply `supabase/migrations/20261013120000_headless_mcp.sql` (additive, idempotent):
   `npx prisma db execute --file supabase/migrations/20261013120000_headless_mcp.sql --schema prisma/schema.prisma`
2. Set `MCP_OAUTH_SECRET` in Vercel (production), marked sensitive.
3. Deploy, then `curl https://<sigil-host>/api/mcp` and
   `curl https://<sigil-host>/.well-known/oauth-protected-resource/api/mcp`.
4. Do not put a bot challenge on `/.well-known/*` or `/api/mcp/oauth/*`: Claude calls them from
   its own servers.

## How the sign-in holds

- Tokens are stored as SHA-256 hashes only. Access tokens last one hour; refresh tokens rotate on
  every use and a replayed one revokes its whole family.
- A token names the server it is for (RFC 8707) and is refused anywhere else.
- Codes go only to Claude's callbacks or a loopback address, are single-use, and need PKCE.
- References are either files the caller uploaded into their own folder or images Sigil drew;
  no tool fetches an arbitrary URL.
- `/api/mcp` and `/api/mcp/oauth/*` are listed as intentionally public in
  `tests/contracts/api-route-auth-coverage.test.ts`; `lib/headless/auth.ts` is their gate.

## Where the code is

| Path | What |
|---|---|
| `app/api/mcp/route.ts` | The endpoint |
| `lib/headless/` | Auth, dispatcher, tools, allowance, the "Claude" project |
| `lib/oauth/`, `app/api/mcp/oauth/`, `app/.well-known/` | The sign-in (ported from Vesper as it is) |
| `app/connect/page.tsx` | The consent page |
| `lib/models/process-generation.ts` | The generation worker, shared with `/api/generate/process` |
| `tests/headless/` | The sign-in flow over an in-memory store, the dispatcher, the allowance |
