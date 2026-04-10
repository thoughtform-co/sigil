/**
 * Notion sync adapter for workshop registrations.
 * Ported from Ledger's Heralds / Arcs / Joiners pattern.
 *
 * Writes to Notion's:
 *   - Arcs (projects DB): one row per workshop event
 *   - Heralds (contacts DB): one row per unique attendee email
 *   - Joiners (per-event child DB): enrollment status per attendee per event
 *
 * All Notion operations are fire-and-forget from the caller's perspective;
 * errors are captured in the sync status fields on the Sigil record.
 */

import { Client } from "@notionhq/client";
import type {
  PageObjectResponse,
  QueryDatabaseResponse,
  CreatePageResponse,
} from "@notionhq/client/build/src/api-endpoints";
import { prisma } from "@/lib/prisma";

function getNotionClient(): Client | null {
  const apiKey = process.env.NOTION_API_KEY;
  if (!apiKey) return null;
  return new Client({ auth: apiKey });
}

function getHeraldsDbId(): string | null {
  return process.env.NOTION_HERALDS_DATABASE_ID ?? null;
}

function getArcsDbId(): string | null {
  return process.env.NOTION_PROJECTS_DATABASE_ID ?? null;
}

function getThoughtformClientPageId(): string | null {
  return process.env.NOTION_THOUGHTFORM_CLIENT_PAGE_ID ?? null;
}

type QueryResultItem = PageObjectResponse | { object: string; [key: string]: unknown };

function isFullPage(item: QueryResultItem): item is PageObjectResponse {
  return "properties" in item && "parent" in item && (item as { object: string }).object === "page";
}

function extractTitle(page: PageObjectResponse): string {
  for (const key of Object.keys(page.properties)) {
    const prop = page.properties[key];
    if (prop.type === "title") {
      return prop.title.map((t) => t.plain_text).join("");
    }
  }
  return "";
}

function extractRichText(page: PageObjectResponse, name: string): string {
  const prop = page.properties[name];
  if (!prop || prop.type !== "rich_text") return "";
  return prop.rich_text.map((t) => t.plain_text).join("");
}

function extractEmail(page: PageObjectResponse, name: string): string {
  const prop = page.properties[name];
  if (!prop || prop.type !== "email") return "";
  return prop.email ?? "";
}

function extractRelationIds(page: PageObjectResponse, name: string): string[] {
  const prop = page.properties[name];
  if (!prop || prop.type !== "relation") return [];
  return prop.relation.map((r) => r.id);
}

// ═══════════════════════════════════════════════════════════════════
// ARC SYNC (workshop event -> Notion project/arc)
// ═══════════════════════════════════════════════════════════════════

export async function syncEventToNotion(eventId: string): Promise<void> {
  const notion = getNotionClient();
  const arcsDbId = getArcsDbId();
  if (!notion || !arcsDbId) {
    await prisma.workshopEvent.update({
      where: { id: eventId },
      data: { notionSyncStatus: "skipped", notionSyncError: "Notion credentials not configured" },
    });
    return;
  }

  const event = await prisma.workshopEvent.findUnique({ where: { id: eventId } });
  if (!event) return;

  try {
    let arcPageId = event.notionArcPageId;

    if (arcPageId) {
      const properties: Record<string, unknown> = {
        Name: { title: [{ text: { content: event.title } }] },
        Date: { date: { start: event.startAt.toISOString().split("T")[0] } },
      };

      await notion.pages.update({
        page_id: arcPageId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        properties: properties as any,
      });
    } else {
      const clientPageId = getThoughtformClientPageId();
      const properties: Record<string, unknown> = {
        Name: { title: [{ text: { content: event.title } }] },
        Date: { date: { start: event.startAt.toISOString().split("T")[0] } },
        "Manifold Type": { select: { name: "Workshop" } },
        Status: { status: { name: "Approved & Ongoing" } },
      };
      if (clientPageId) {
        properties.Clients = { relation: [{ id: clientPageId }] };
      }

      const resp: CreatePageResponse = await notion.pages.create({
        parent: { database_id: arcsDbId },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        properties: properties as any,
      });
      arcPageId = (resp as PageObjectResponse).id;
    }

    await prisma.workshopEvent.update({
      where: { id: eventId },
      data: {
        notionArcPageId: arcPageId,
        notionSyncStatus: "synced",
        notionSyncError: null,
        notionSyncedAt: new Date(),
      },
    });

    console.log(`[notion-sync] Event "${event.title}" synced to Arc ${arcPageId}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.workshopEvent.update({
      where: { id: eventId },
      data: { notionSyncStatus: "failed", notionSyncError: message },
    });
    console.error(`[notion-sync] Event sync failed for "${event.title}":`, message);
  }
}

// ═══════════════════════════════════════════════════════════════════
// HERALD + JOINER SYNC (registration -> Notion contact + enrollment)
// ═══════════════════════════════════════════════════════════════════

async function findHeraldByEmail(notion: Client, heraldsDbId: string, email: string): Promise<PageObjectResponse | null> {
  const resp: QueryDatabaseResponse = await notion.databases.query({
    database_id: heraldsDbId,
    filter: { property: "Email", email: { equals: email } },
    page_size: 1,
  });
  const page = resp.results.find((r) => isFullPage(r as QueryResultItem)) as PageObjectResponse | undefined;
  return page ?? null;
}

async function upsertHerald(
  notion: Client,
  heraldsDbId: string,
  opts: { name: string; email: string; vatNumber?: string; arcPageId?: string },
): Promise<string> {
  const existing = await findHeraldByEmail(notion, heraldsDbId, opts.email);

  if (existing) {
    const properties: Record<string, unknown> = {};
    let changed = false;

    if (opts.name && opts.name !== extractTitle(existing)) {
      properties.Name = { title: [{ text: { content: opts.name } }] };
      changed = true;
    }
    if (opts.vatNumber && opts.vatNumber !== extractRichText(existing, "BTW")) {
      properties.BTW = { rich_text: [{ text: { content: opts.vatNumber } }] };
      changed = true;
    }
    if (opts.arcPageId) {
      const existingArcIds = extractRelationIds(existing, "Arcs");
      const normalizedNew = opts.arcPageId.replace(/-/g, "");
      if (!existingArcIds.some((id) => id.replace(/-/g, "") === normalizedNew)) {
        const relations = existingArcIds.map((id) => ({ id }));
        relations.push({ id: opts.arcPageId });
        properties.Arcs = { relation: relations };
        changed = true;
      }
    }

    if (changed) {
      await notion.pages.update({
        page_id: existing.id,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        properties: properties as any,
      });
    }
    return existing.id;
  }

  const properties: Record<string, unknown> = {
    Name: { title: [{ text: { content: opts.name } }] },
    Email: { email: opts.email },
  };
  if (opts.vatNumber) {
    properties.BTW = { rich_text: [{ text: { content: opts.vatNumber } }] };
  }
  if (opts.arcPageId) {
    properties.Arcs = { relation: [{ id: opts.arcPageId }] };
  }

  const resp: CreatePageResponse = await notion.pages.create({
    parent: { database_id: heraldsDbId },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    properties: properties as any,
  });
  return (resp as PageObjectResponse).id;
}

export async function syncRegistrationToNotion(registrationId: string): Promise<void> {
  const notion = getNotionClient();
  const heraldsDbId = getHeraldsDbId();
  if (!notion || !heraldsDbId) {
    await prisma.workshopRegistration.update({
      where: { id: registrationId },
      data: { notionSyncStatus: "skipped", notionSyncError: "Notion credentials not configured" },
    });
    return;
  }

  const registration = await prisma.workshopRegistration.findUnique({
    where: { id: registrationId },
    include: { event: true },
  });
  if (!registration) return;

  try {
    const heraldPageId = await upsertHerald(notion, heraldsDbId, {
      name: registration.name,
      email: registration.email,
      vatNumber: registration.vatNumber ?? undefined,
      arcPageId: registration.event.notionArcPageId ?? undefined,
    });

    await prisma.workshopRegistration.update({
      where: { id: registrationId },
      data: {
        notionHeraldPageId: heraldPageId,
        notionSyncStatus: "synced",
        notionSyncError: null,
        notionSyncedAt: new Date(),
      },
    });

    console.log(`[notion-sync] Registration ${registration.email} synced to Herald ${heraldPageId}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.workshopRegistration.update({
      where: { id: registrationId },
      data: { notionSyncStatus: "failed", notionSyncError: message },
    });
    console.error(`[notion-sync] Registration sync failed for ${registration.email}:`, message);
  }
}

// ═══════════════════════════════════════════════════════════════════
// BATCH RETRY (pick up failed/pending syncs)
// ═══════════════════════════════════════════════════════════════════

export async function retryFailedEventSyncs(): Promise<number> {
  const events = await prisma.workshopEvent.findMany({
    where: { notionSyncStatus: { in: ["pending", "failed"] }, status: { not: "draft" } },
    select: { id: true },
    take: 20,
  });
  for (const e of events) {
    await syncEventToNotion(e.id);
  }
  return events.length;
}

export async function retryFailedRegistrationSyncs(): Promise<number> {
  const registrations = await prisma.workshopRegistration.findMany({
    where: { notionSyncStatus: { in: ["pending", "failed"] } },
    select: { id: true },
    take: 50,
  });
  for (const r of registrations) {
    await syncRegistrationToNotion(r.id);
  }
  return registrations.length;
}
