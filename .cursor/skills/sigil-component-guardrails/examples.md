# Examples

## Good: shared type for prefetch + UI

```ts
// lib/types/generation.ts — canonical shape
export type GenerationItem = { id: string; /* ... */ };

// lib/prefetch/workspace.ts
import type { GenerationItem } from "@/lib/types/generation";
```

## Good: card from primitives

```tsx
import { CardFrame } from "@/components/ui/CardFrame";
import { CardTitle, CardDivider, CardStats } from "@/components/ui/card";

<CardFrame as={Link} href={href} prefetch>
  <CardTitle fontSize="13px">Title</CardTitle>
  <CardDivider marginTop={8} marginBottom={8} />
  <CardStats entries={[{ value: 3, label: "routes" }]} />
</CardFrame>
```

## Good: new API route

```ts
export async function POST(req: Request) {
  const user = await getAuthedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // ...
}
```

## Avoid

- Importing `@/components/foo` from `lib/bar.ts`.
- New `RouteCard` name in a second folder without disambiguating (use `RouteSummaryCard` or dashboard `RouteCard` only in `components/dashboard/`).
- Duplicating `PencilIcon` / `TrashIcon` when `components/ui/icons/AdminActionIcons.tsx` exists.

## Exception: bespoke workshop section

Branded palette and layout are intentional — still use tokens where they match the main app shell.
