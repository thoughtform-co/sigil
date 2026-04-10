import { requireAdmin } from "@/lib/auth/require-admin";
import { json } from "@/lib/api/responses";
import { badRequest } from "@/lib/api/errors";
import { NextResponse } from "next/server";
import {
  getEventAdmin,
  updateEvent,
  workshopEventUpdateSchema,
} from "@/lib/workshop-registration";

type Params = Promise<{ id: string }>;

export async function GET(_request: Request, { params }: { params: Params }) {
  const result = await requireAdmin();
  if ("error" in result) return result.error;

  const { id } = await params;
  const event = await getEventAdmin(id);
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return json(event);
}

export async function PATCH(request: Request, { params }: { params: Params }) {
  const result = await requireAdmin();
  if ("error" in result) return result.error;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = workshopEventUpdateSchema.extend({
    status: workshopEventUpdateSchema.shape.slug.optional(),
  }).safeParse(body);
  if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

  const event = await updateEvent(id, parsed.data as Parameters<typeof updateEvent>[1]);
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return json(event);
}
