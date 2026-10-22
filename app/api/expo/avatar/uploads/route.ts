/**
 * Upload URLs for the pictures a student drops into Expo City's character creator: the same signed
 * URLs create_upload_urls hands Claude, into the student's own folder of the references bucket. The
 * game PUTs each picture to its URL and passes the `ref`s to POST /api/expo/avatar.
 * `{ files: [{ mimeType, name? }] }`, one to four, image/jpeg, image/png or image/webp.
 */

import { NextResponse } from "next/server";
import { getAuthedUser } from "@/lib/auth/server";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { UploadsBodySchema } from "@/lib/headless/avatar";
import { createReferenceUploads } from "@/lib/headless/tools";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

export async function POST(request: Request): Promise<Response> {
  const user = await getAuthedUser();
  if (!user) return NextResponse.json({ error: "Sign in to Sigil first.", code: "unauthorized" }, { status: 401, headers: NO_STORE });
  const limited = checkRateLimit("expo-avatar", user.id);
  if (limited) {
    limited.headers.set("Cache-Control", "no-store");
    return limited;
  }
  if (!(request.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) {
    return NextResponse.json({ error: "Send it as JSON.", code: "unsupported_media_type" }, { status: 415, headers: NO_STORE });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "The body is not JSON.", code: "invalid" }, { status: 400, headers: NO_STORE });
  }
  const parsed = UploadsBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "One to four pictures: { files: [{ mimeType }] }, as JPEG, PNG or WebP.", code: "invalid" }, { status: 400, headers: NO_STORE });
  }
  try {
    const uploads = await createReferenceUploads(user.id, parsed.data.files);
    return NextResponse.json({ uploads: uploads.map(({ ref, uploadUrl, mimeType }) => ({ ref, uploadUrl, mimeType })) }, { headers: NO_STORE });
  } catch (err) {
    console.warn("[expo] avatar uploads failed", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "The upload could not be prepared just now; try again.", code: "unavailable" }, { status: 503, headers: NO_STORE });
  }
}
