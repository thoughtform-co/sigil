import { requireAdmin } from "@/lib/auth/require-admin";
import { json } from "@/lib/api/responses";
import { badRequest } from "@/lib/api/errors";
import {
  listEventsAdmin,
  createEvent,
  workshopEventCreateSchema,
} from "@/lib/workshop-registration";

export async function GET() {
  const result = await requireAdmin();
  if ("error" in result) return result.error;

  const events = await listEventsAdmin();
  return json(events);
}

export async function POST(request: Request) {
  const result = await requireAdmin();
  if ("error" in result) return result.error;

  const body = await request.json().catch(() => null);
  const parsed = workshopEventCreateSchema.safeParse(body);
  if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

  const event = await createEvent(parsed.data);
  return json(event, 201);
}
