import { requireAdmin } from "@/lib/auth/require-admin";
import { json } from "@/lib/api/responses";
import { badRequest } from "@/lib/api/errors";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  listRegistrations,
  updateRegistrationStatus,
  updatePaymentStatus,
} from "@/lib/workshop-registration";

type Params = Promise<{ id: string }>;

export async function GET(_request: Request, { params }: { params: Params }) {
  const result = await requireAdmin();
  if ("error" in result) return result.error;

  const { id } = await params;
  const registrations = await listRegistrations(id);
  return json(registrations);
}

const updateSchema = z.object({
  registrationId: z.string().uuid(),
  action: z.enum(["approve", "decline", "cancel", "mark_invoiced", "mark_paid", "mark_refunded"]),
});

export async function PATCH(request: Request) {
  const result = await requireAdmin();
  if ("error" in result) return result.error;

  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

  const { registrationId, action } = parsed.data;

  const statusActions: Record<string, () => ReturnType<typeof updateRegistrationStatus>> = {
    approve: () => updateRegistrationStatus(registrationId, "approved"),
    decline: () => updateRegistrationStatus(registrationId, "declined"),
    cancel: () => updateRegistrationStatus(registrationId, "cancelled"),
  };

  const paymentActions: Record<string, () => ReturnType<typeof updatePaymentStatus>> = {
    mark_invoiced: () => updatePaymentStatus(registrationId, "invoiced"),
    mark_paid: () => updatePaymentStatus(registrationId, "paid"),
    mark_refunded: () => updatePaymentStatus(registrationId, "refunded"),
  };

  const handler = statusActions[action] ?? paymentActions[action];
  if (!handler) return badRequest("Unknown action");

  const updated = await handler();
  if (!updated) return NextResponse.json({ error: "Registration not found" }, { status: 404 });

  return json(updated);
}
