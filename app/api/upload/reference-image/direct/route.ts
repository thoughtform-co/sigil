import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getAuthedUser } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { projectAccessFilter } from "@/lib/auth/project-access";
import { createAdminClient } from "@/lib/supabase/admin";
import { REFERENCES_BUCKET } from "@/lib/supabase/storage";
import { createReferenceSignedUrl } from "@/lib/reference-images";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

function inferReferenceExtension(mimeType: string): string {
  if (mimeType.includes("png")) return "png";
  if (mimeType.includes("webp")) return "webp";
  if (mimeType.includes("gif")) return "gif";
  return "jpg";
}

async function ensureReferencesBucketExists(admin: ReturnType<typeof createAdminClient>): Promise<void> {
  const { data: buckets, error: listError } = await admin.storage.listBuckets();
  if (listError) {
    throw new Error(`Unable to list storage buckets: ${listError.message}`);
  }
  const exists = buckets.some((item) => item.id === REFERENCES_BUCKET || item.name === REFERENCES_BUCKET);
  if (exists) return;
  const { error: createError } = await admin.storage.createBucket(REFERENCES_BUCKET, { public: false });
  if (createError && !/already exists/i.test(createError.message)) {
    throw new Error(`Unable to create storage bucket "${REFERENCES_BUCKET}": ${createError.message}`);
  }
}

async function ensureProjectAccess(projectId: string | undefined, userId: string): Promise<NextResponse | null> {
  if (!projectId) return null;
  const accessFilter = await projectAccessFilter(userId);
  const project = await prisma.project.findFirst({
    where: { id: projectId, ...accessFilter },
  });
  if (!project) {
    return NextResponse.json({ error: "Project not found or access denied" }, { status: 403 });
  }
  return null;
}

export async function POST(request: NextRequest) {
  const user = await getAuthedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const action = body?.action;

  if (action === "prepare") {
    const rateLimitResponse = checkRateLimit("upload", user.id);
    if (rateLimitResponse) return rateLimitResponse;

    const mimeType = typeof body?.mimeType === "string" ? body.mimeType.trim().toLowerCase() : "";
    if (!mimeType.startsWith("image/")) {
      return NextResponse.json({ error: "File must be an image" }, { status: 400 });
    }

    const projectId =
      typeof body?.projectId === "string" && body.projectId.trim().length > 0
        ? body.projectId.trim()
        : undefined;
    const projectAccessError = await ensureProjectAccess(projectId, user.id);
    if (projectAccessError) return projectAccessError;

    const referenceImageId =
      typeof body?.referenceImageId === "string" && body.referenceImageId.trim().length > 0
        ? body.referenceImageId.trim()
        : `ref-${Date.now()}-${randomUUID().slice(0, 8)}`;
    const path = `references/${user.id}/${referenceImageId}.${inferReferenceExtension(mimeType)}`;

    try {
      const admin = createAdminClient();
      await ensureReferencesBucketExists(admin);
      const { data, error } = await admin.storage
        .from(REFERENCES_BUCKET)
        .createSignedUploadUrl(path, { upsert: true });
      if (error || !data?.token || !data?.path) {
        return NextResponse.json(
          { error: error?.message ?? "Failed to create signed upload URL" },
          { status: 500 },
        );
      }
      return NextResponse.json({
        bucket: REFERENCES_BUCKET,
        path: data.path,
        token: data.token,
        signedUrl: data.signedUrl,
        referenceImageId,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to prepare upload";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  if (action === "complete") {
    const path = typeof body?.path === "string" ? body.path.trim() : "";
    if (!path || !path.startsWith(`references/${user.id}/`) || path.includes("..")) {
      return NextResponse.json({ error: "Invalid reference image path" }, { status: 400 });
    }

    try {
      const signedUrl = await createReferenceSignedUrl(path);
      return NextResponse.json({
        url: signedUrl,
        referenceImageUrl: signedUrl,
        path,
        bucket: REFERENCES_BUCKET,
        referenceImageId:
          typeof body?.referenceImageId === "string" && body.referenceImageId.trim().length > 0
            ? body.referenceImageId.trim()
            : undefined,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to finalize upload";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  return NextResponse.json(
    { error: "Unsupported action. Expected 'prepare' or 'complete'." },
    { status: 400 },
  );
}
