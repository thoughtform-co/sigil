/**
 * Portable DTOs for the workshop registration module.
 * These types are independent of Prisma and can move to another repo.
 */

export type WorkshopEventStatus = "draft" | "published" | "closed" | "cancelled";
export type RegistrationStatus = "registered" | "approved" | "declined" | "cancelled";
export type PaymentStatus = "not_required" | "pending_invoice" | "invoiced" | "paid" | "refunded";
export type NotionSyncStatus = "pending" | "synced" | "failed" | "skipped";

export interface RegistrationQuestion {
  id: string;
  label: string;
  type: "text" | "textarea" | "select" | "checkbox";
  required: boolean;
  options?: string[];
  placeholder?: string;
}

export interface RegistrationAnswer {
  questionId: string;
  label: string;
  value: string;
}

export interface WorkshopEventPublic {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  coverImageUrl: string | null;
  status: WorkshopEventStatus;

  startAt: string;
  endAt: string | null;
  timezone: string;
  locationName: string | null;
  locationAddress: string | null;
  isOnline: boolean;

  capacity: number | null;
  spotsRemaining: number | null;
  priceAmountCents: number | null;
  priceCurrency: string | null;

  hostName: string | null;
  hostAvatarUrl: string | null;

  registrationQuestions: RegistrationQuestion[];
  registrationCount: number;
}

export interface WorkshopEventAdmin extends WorkshopEventPublic {
  workspaceProjectId: string | null;
  requireApproval: boolean;
  onlineUrl: string | null;
  notionArcPageId: string | null;
  notionSyncStatus: NotionSyncStatus;
  createdAt: string;
  updatedAt: string;
}

export interface WorkshopRegistrationSubmit {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  vatNumber?: string;
  answers?: RegistrationAnswer[];
}

export interface WorkshopRegistrationItem {
  id: string;
  eventId: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  vatNumber: string | null;
  status: RegistrationStatus;
  paymentStatus: PaymentStatus;
  answers: RegistrationAnswer[] | null;
  notionSyncStatus: NotionSyncStatus;
  createdAt: string;
}

export interface WorkshopRegistrationResult {
  id: string;
  status: RegistrationStatus;
  eventTitle: string;
  message: string;
}
