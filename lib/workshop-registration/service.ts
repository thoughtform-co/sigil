/**
 * Workshop registration service — portable business logic layer.
 * Handles event CRUD and registration lifecycle.
 * Notion sync is triggered here but delegated to the adapter.
 */

import { prisma } from "@/lib/prisma";
import type {
  WorkshopEventPublic,
  WorkshopEventAdmin,
  WorkshopRegistrationItem,
  WorkshopRegistrationResult,
  RegistrationQuestion,
  RegistrationAnswer,
} from "@/lib/types/workshop-registration";
import type { WorkshopRegistrationSubmitInput, WorkshopEventCreateInput } from "./validation";
import { syncEventToNotion, syncRegistrationToNotion } from "./notion-sync";

function parseQuestions(raw: unknown): RegistrationQuestion[] {
  if (!Array.isArray(raw)) return [];
  return raw as RegistrationQuestion[];
}

function parseAnswers(raw: unknown): RegistrationAnswer[] | null {
  if (!Array.isArray(raw)) return null;
  return raw as RegistrationAnswer[];
}

export async function getPublishedEvent(slug: string): Promise<WorkshopEventPublic | null> {
  const event = await prisma.workshopEvent.findUnique({
    where: { slug },
    include: { _count: { select: { registrations: { where: { status: { not: "cancelled" } } } } } },
  });
  if (!event || event.status === "draft") return null;

  const questions = parseQuestions(event.registrationQuestions);
  const regCount = event._count.registrations;
  const spotsRemaining = event.capacity != null ? Math.max(0, event.capacity - regCount) : null;

  return {
    id: event.id,
    slug: event.slug,
    title: event.title,
    description: event.description,
    coverImageUrl: event.coverImageUrl,
    status: event.status,
    startAt: event.startAt.toISOString(),
    endAt: event.endAt?.toISOString() ?? null,
    timezone: event.timezone,
    locationName: event.locationName,
    locationAddress: event.locationAddress,
    isOnline: event.isOnline,
    capacity: event.capacity,
    spotsRemaining,
    priceAmountCents: event.priceAmountCents,
    priceCurrency: event.priceCurrency,
    hostName: event.hostName,
    hostAvatarUrl: event.hostAvatarUrl,
    registrationQuestions: questions,
    registrationCount: regCount,
  };
}

export async function getEventAdmin(id: string): Promise<WorkshopEventAdmin | null> {
  const event = await prisma.workshopEvent.findUnique({
    where: { id },
    include: { _count: { select: { registrations: { where: { status: { not: "cancelled" } } } } } },
  });
  if (!event) return null;

  const questions = parseQuestions(event.registrationQuestions);
  const regCount = event._count.registrations;
  const spotsRemaining = event.capacity != null ? Math.max(0, event.capacity - regCount) : null;

  return {
    id: event.id,
    slug: event.slug,
    title: event.title,
    description: event.description,
    coverImageUrl: event.coverImageUrl,
    status: event.status,
    startAt: event.startAt.toISOString(),
    endAt: event.endAt?.toISOString() ?? null,
    timezone: event.timezone,
    locationName: event.locationName,
    locationAddress: event.locationAddress,
    isOnline: event.isOnline,
    capacity: event.capacity,
    spotsRemaining,
    priceAmountCents: event.priceAmountCents,
    priceCurrency: event.priceCurrency,
    hostName: event.hostName,
    hostAvatarUrl: event.hostAvatarUrl,
    registrationQuestions: questions,
    registrationCount: regCount,
    workspaceProjectId: event.workspaceProjectId,
    requireApproval: event.requireApproval,
    onlineUrl: event.onlineUrl,
    notionArcPageId: event.notionArcPageId,
    notionSyncStatus: event.notionSyncStatus,
    createdAt: event.createdAt.toISOString(),
    updatedAt: event.updatedAt.toISOString(),
  };
}

export async function listEventsAdmin(): Promise<WorkshopEventAdmin[]> {
  const events = await prisma.workshopEvent.findMany({
    orderBy: { startAt: "asc" },
    include: { _count: { select: { registrations: { where: { status: { not: "cancelled" } } } } } },
  });

  return events.map((event) => {
    const questions = parseQuestions(event.registrationQuestions);
    const regCount = event._count.registrations;
    const spotsRemaining = event.capacity != null ? Math.max(0, event.capacity - regCount) : null;

    return {
      id: event.id,
      slug: event.slug,
      title: event.title,
      description: event.description,
      coverImageUrl: event.coverImageUrl,
      status: event.status,
      startAt: event.startAt.toISOString(),
      endAt: event.endAt?.toISOString() ?? null,
      timezone: event.timezone,
      locationName: event.locationName,
      locationAddress: event.locationAddress,
      isOnline: event.isOnline,
      capacity: event.capacity,
      spotsRemaining,
      priceAmountCents: event.priceAmountCents,
      priceCurrency: event.priceCurrency,
      hostName: event.hostName,
      hostAvatarUrl: event.hostAvatarUrl,
      registrationQuestions: questions,
      registrationCount: regCount,
      workspaceProjectId: event.workspaceProjectId,
      requireApproval: event.requireApproval,
      onlineUrl: event.onlineUrl,
      notionArcPageId: event.notionArcPageId,
      notionSyncStatus: event.notionSyncStatus,
      createdAt: event.createdAt.toISOString(),
      updatedAt: event.updatedAt.toISOString(),
    };
  });
}

export async function createEvent(input: WorkshopEventCreateInput): Promise<WorkshopEventAdmin> {
  const event = await prisma.workshopEvent.create({
    data: {
      slug: input.slug,
      title: input.title,
      description: input.description,
      coverImageUrl: input.coverImageUrl,
      startAt: new Date(input.startAt),
      endAt: input.endAt ? new Date(input.endAt) : undefined,
      timezone: input.timezone,
      locationName: input.locationName,
      locationAddress: input.locationAddress,
      isOnline: input.isOnline,
      onlineUrl: input.onlineUrl,
      capacity: input.capacity,
      requireApproval: input.requireApproval,
      priceAmountCents: input.priceAmountCents,
      priceCurrency: input.priceCurrency,
      workspaceProjectId: input.workspaceProjectId,
      registrationQuestions: input.registrationQuestions ?? [],
      hostName: input.hostName,
      hostAvatarUrl: input.hostAvatarUrl,
    },
  });

  return (await getEventAdmin(event.id))!;
}

export async function updateEvent(id: string, input: Partial<WorkshopEventCreateInput> & { status?: string }): Promise<WorkshopEventAdmin | null> {
  const existing = await prisma.workshopEvent.findUnique({ where: { id } });
  if (!existing) return null;

  // Build a flat data object that Prisma accepts for unchecked updates.
  const data: Record<string, unknown> = {};
  if (input.slug !== undefined) data.slug = input.slug;
  if (input.title !== undefined) data.title = input.title;
  if (input.description !== undefined) data.description = input.description;
  if (input.coverImageUrl !== undefined) data.coverImageUrl = input.coverImageUrl;
  if (input.startAt !== undefined) data.startAt = new Date(input.startAt);
  if (input.endAt !== undefined) data.endAt = input.endAt ? new Date(input.endAt) : null;
  if (input.timezone !== undefined) data.timezone = input.timezone;
  if (input.locationName !== undefined) data.locationName = input.locationName;
  if (input.locationAddress !== undefined) data.locationAddress = input.locationAddress;
  if (input.isOnline !== undefined) data.isOnline = input.isOnline;
  if (input.onlineUrl !== undefined) data.onlineUrl = input.onlineUrl;
  if (input.capacity !== undefined) data.capacity = input.capacity;
  if (input.requireApproval !== undefined) data.requireApproval = input.requireApproval;
  if (input.priceAmountCents !== undefined) data.priceAmountCents = input.priceAmountCents;
  if (input.priceCurrency !== undefined) data.priceCurrency = input.priceCurrency;
  if (input.registrationQuestions !== undefined) data.registrationQuestions = input.registrationQuestions;
  if (input.hostName !== undefined) data.hostName = input.hostName;
  if (input.hostAvatarUrl !== undefined) data.hostAvatarUrl = input.hostAvatarUrl;
  if (input.status !== undefined) data.status = input.status;
  if (input.workspaceProjectId !== undefined) {
    data.workspaceProject = input.workspaceProjectId
      ? { connect: { id: input.workspaceProjectId } }
      : { disconnect: true };
  }

  await prisma.workshopEvent.update({ where: { id }, data });

  // Sync to Notion when event transitions to a non-draft state
  if (data.status && data.status !== "draft") {
    syncEventToNotion(id).catch((err) => {
      console.error("[workshop-registration] Background Notion event sync error:", err);
    });
  }

  return getEventAdmin(id);
}

export async function submitRegistration(
  slug: string,
  input: WorkshopRegistrationSubmitInput,
  ipAddress: string | null,
): Promise<WorkshopRegistrationResult> {
  const event = await prisma.workshopEvent.findUnique({
    where: { slug },
    include: { _count: { select: { registrations: { where: { status: { not: "cancelled" } } } } } },
  });

  if (!event || event.status !== "published") {
    throw new RegistrationError("Event not found or not accepting registrations", "event_not_found");
  }

  if (event.capacity != null && event._count.registrations >= event.capacity) {
    throw new RegistrationError("This event is full", "event_full");
  }

  const existing = await prisma.workshopRegistration.findUnique({
    where: { eventId_email: { eventId: event.id, email: input.email.toLowerCase() } },
  });
  if (existing && existing.status !== "cancelled") {
    throw new RegistrationError("You are already registered for this event", "already_registered");
  }

  const paymentStatus = event.priceAmountCents && event.priceAmountCents > 0
    ? "pending_invoice" as const
    : "not_required" as const;

  const status = event.requireApproval ? "registered" as const : "registered" as const;

  const registration = await prisma.workshopRegistration.upsert({
    where: { eventId_email: { eventId: event.id, email: input.email.toLowerCase() } },
    update: {
      name: input.name,
      phone: input.phone,
      company: input.company,
      vatNumber: input.vatNumber,
      answers: input.answers ?? [],
      status,
      paymentStatus,
      ipAddress,
    },
    create: {
      eventId: event.id,
      name: input.name,
      email: input.email.toLowerCase(),
      phone: input.phone,
      company: input.company,
      vatNumber: input.vatNumber,
      answers: input.answers ?? [],
      status,
      paymentStatus,
      ipAddress,
    },
  });

  // Fire-and-forget Notion sync (do not block the response)
  syncRegistrationToNotion(registration.id).catch((err) => {
    console.error("[workshop-registration] Background Notion sync error:", err);
  });

  return {
    id: registration.id,
    status: registration.status as "registered",
    eventTitle: event.title,
    message: "Registration successful. You will receive a confirmation shortly.",
  };
}

export async function listRegistrations(eventId: string): Promise<WorkshopRegistrationItem[]> {
  const registrations = await prisma.workshopRegistration.findMany({
    where: { eventId },
    orderBy: { createdAt: "desc" },
  });

  return registrations.map((r) => ({
    id: r.id,
    eventId: r.eventId,
    name: r.name,
    email: r.email,
    phone: r.phone,
    company: r.company,
    vatNumber: r.vatNumber,
    status: r.status as WorkshopRegistrationItem["status"],
    paymentStatus: r.paymentStatus as WorkshopRegistrationItem["paymentStatus"],
    answers: parseAnswers(r.answers),
    notionSyncStatus: r.notionSyncStatus as WorkshopRegistrationItem["notionSyncStatus"],
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function updateRegistrationStatus(
  id: string,
  status: "approved" | "declined" | "cancelled",
): Promise<WorkshopRegistrationItem | null> {
  const existing = await prisma.workshopRegistration.findUnique({ where: { id } });
  if (!existing) return null;

  const updated = await prisma.workshopRegistration.update({
    where: { id },
    data: { status },
  });

  return {
    id: updated.id,
    eventId: updated.eventId,
    name: updated.name,
    email: updated.email,
    phone: updated.phone,
    company: updated.company,
    vatNumber: updated.vatNumber,
    status: updated.status as WorkshopRegistrationItem["status"],
    paymentStatus: updated.paymentStatus as WorkshopRegistrationItem["paymentStatus"],
    answers: parseAnswers(updated.answers),
    notionSyncStatus: updated.notionSyncStatus as WorkshopRegistrationItem["notionSyncStatus"],
    createdAt: updated.createdAt.toISOString(),
  };
}

export async function updatePaymentStatus(
  id: string,
  paymentStatus: "pending_invoice" | "invoiced" | "paid" | "refunded",
): Promise<WorkshopRegistrationItem | null> {
  const existing = await prisma.workshopRegistration.findUnique({ where: { id } });
  if (!existing) return null;

  const updated = await prisma.workshopRegistration.update({
    where: { id },
    data: { paymentStatus },
  });

  return {
    id: updated.id,
    eventId: updated.eventId,
    name: updated.name,
    email: updated.email,
    phone: updated.phone,
    company: updated.company,
    vatNumber: updated.vatNumber,
    status: updated.status as WorkshopRegistrationItem["status"],
    paymentStatus: updated.paymentStatus as WorkshopRegistrationItem["paymentStatus"],
    answers: parseAnswers(updated.answers),
    notionSyncStatus: updated.notionSyncStatus as WorkshopRegistrationItem["notionSyncStatus"],
    createdAt: updated.createdAt.toISOString(),
  };
}

export class RegistrationError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = "RegistrationError";
  }
}
