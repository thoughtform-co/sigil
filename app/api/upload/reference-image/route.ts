import { NextRequest, NextResponse } from "next/server";
import { getAuthedUser } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { persistReferenceImage } from "@/lib/reference-images";
import { validateImageDataUrl } from "@/lib/security/image-validation";
import { checkRateLimit } from "@/lib/api/rate-limit";

export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

/**
 * Upload reference image (multipart file or JSON dataUrl).
 * Returns stable public URL and pointer metadata for use in generation requests.
 * Optional projectId: if provided, user must be owner or member.
 */
export async function POST(request: NextRequest) {
  const user = await getAuthedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimitResponse = checkRateLimit("upload", user.id);
  if (rateLimitResponse) return rateLimitResponse;

  const contentType = request.headers.get("content-type") ?? "";
  let dataUrl: string;

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const projectId = formData.get("projectId") as string | null;
    if (projectId) {
      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
          OR: [{ ownerId: user.id }, { members: { some: { userId: user.id } } }],
        },
      });
      if (!project) {
        return NextResponse.json({ error: "Project not found or access denied" }, { status: 403 });
      }
    }
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "File must be an image" }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Max ${MAX_FILE_SIZE / (1024 * 1024)}MB` },
        { status: 400 }
      );
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString("base64");
    const mime = file.type || "image/png";
    dataUrl = `data:${mime};base64,${base64}`;
  } else if (contentType.includes("application/json")) {
    const body = await request.json().catch(() => null);
    const raw = body?.dataUrl ?? body?.referenceImageUrl;
    if (typeof raw !== "string" || !raw.startsWith("data:")) {
      return NextResponse.json({ error: "Missing or invalid dataUrl" }, { status: 400 });
    }
    try {
      validateImageDataUrl(raw);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Invalid image";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    const projectId = body?.projectId;
    if (projectId) {
      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
          OR: [{ ownerId: user.id }, { members: { some: { userId: user.id } } }],
        },
      });
      if (!project) {
        return NextResponse.json({ error: "Project not found or access denied" }, { status: 403 });
      }
    }
    dataUrl = raw;
  } else {
    return NextResponse.json(
      { error: "Content-Type must be application/json or multipart/form-data" },
      { status: 400 }
    );
  }

  try {
    const pointer = await persistReferenceImage(dataUrl, user.id);
    return NextResponse.json({
      url: pointer.referenceImageUrl,
      referenceImageId: pointer.referenceImageId,
      referenceImageUrl: pointer.referenceImageUrl,
      bucket: pointer.referenceImageBucket,
      path: pointer.referenceImagePath,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
