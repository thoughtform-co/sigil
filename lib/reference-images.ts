import { createAdminClient } from "@/lib/supabase/admin";
import { createHash } from "crypto";
import { REFERENCES_BUCKET, uploadBase64ToStorage } from "@/lib/supabase/storage";

const REFERENCE_SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 30;

export interface ReferenceImagePointer {
  referenceImageId: string;
  referenceImageBucket: string;
  referenceImagePath: string;
  referenceImageUrl: string;
  referenceImageChecksum: string;
  referenceImageMimeType: string;
}

function parseBase64DataUrl(value: string): { mimeType: string; base64Payload: string } {
  if (typeof value !== "string" || !value.startsWith("data:")) {
    throw new Error("Invalid reference image format. Expected data URL.");
  }
  const commaIndex = value.indexOf(",");
  if (commaIndex === -1) {
    throw new Error("Invalid reference image format. Expected data URL with comma separator.");
  }
  const meta = value.slice("data:".length, commaIndex);
  const base64Payload = value.slice(commaIndex + 1);
  const MAX_BASE64_CHARS = 25_000_000;
  if (base64Payload.length > MAX_BASE64_CHARS) {
    throw new Error(
      `Reference image too large (${(base64Payload.length / (1024 * 1024)).toFixed(1)}MB base64). Please use a smaller image.`
    );
  }
  const parts = meta.split(";").filter(Boolean);
  const mimeType = parts[0] || "application/octet-stream";
  const isBase64 = parts.includes("base64");
  if (!isBase64) {
    throw new Error("Invalid reference image format. Expected base64-encoded data URL.");
  }
  return { mimeType, base64Payload };
}

/**
 * Persist a reference image (data URL) to storage and return a stable pointer (Vesper parity).
 * Use the returned referenceImageUrl in generation requests.
 */
export async function persistReferenceImage(
  base64DataUrl: string,
  userId: string,
  referenceImageId?: string
): Promise<ReferenceImagePointer> {
  const { mimeType, base64Payload } = parseBase64DataUrl(base64DataUrl);
  const extension = mimeType.includes("png") ? "png" : "jpg";
  const checksum = createHash("sha256").update(base64Payload).digest("hex");
  const pointerId = referenceImageId ?? `ref-${Date.now()}-${checksum.slice(0, 8)}`;
  const storagePath = `references/${userId}/${pointerId}.${extension}`;
  const publicUrl = await uploadBase64ToStorage(base64DataUrl, REFERENCES_BUCKET, storagePath);
  return {
    referenceImageId: pointerId,
    referenceImageBucket: REFERENCES_BUCKET,
    referenceImagePath: storagePath,
    referenceImageUrl: publicUrl,
    referenceImageChecksum: checksum,
    referenceImageMimeType: mimeType,
  };
}

function getReferenceObjectPathFromUrl(value: string): string | null {
  try {
    const url = new URL(value);
    const signMarker = `/storage/v1/object/sign/${REFERENCES_BUCKET}/`;
    const publicMarker = `/storage/v1/object/public/${REFERENCES_BUCKET}/`;
    const signIdx = url.pathname.indexOf(signMarker);
    if (signIdx >= 0) {
      return decodeURIComponent(url.pathname.slice(signIdx + signMarker.length));
    }
    const publicIdx = url.pathname.indexOf(publicMarker);
    if (publicIdx >= 0) {
      return decodeURIComponent(url.pathname.slice(publicIdx + publicMarker.length));
    }
  } catch {
    // Ignore invalid URLs and fall back to original value.
  }
  return null;
}

export async function createReferenceSignedUrl(path: string): Promise<string> {
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(REFERENCES_BUCKET)
    .createSignedUrl(path, REFERENCE_SIGNED_URL_TTL_SECONDS);
  if (error || !data?.signedUrl) {
    throw new Error(`Failed to create signed reference URL: ${error?.message ?? "unknown error"}`);
  }
  return data.signedUrl;
}

export async function refreshReferenceImageUrl(
  url: string,
  pathHint?: string | null,
): Promise<string> {
  const objectPath = (typeof pathHint === "string" && pathHint.trim().length > 0)
    ? pathHint.trim()
    : getReferenceObjectPathFromUrl(url);
  if (!objectPath) return url;
  try {
    return await createReferenceSignedUrl(objectPath);
  } catch {
    return url;
  }
}

export async function hydrateReferenceParameters(
  parameters: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const next = { ...parameters };
  const singleUrl = typeof parameters.referenceImageUrl === "string"
    ? parameters.referenceImageUrl
    : null;
  const singlePath = typeof parameters.referenceImagePath === "string" &&
    parameters.referenceImagePath.trim().length > 0
    ? parameters.referenceImagePath.trim()
    : null;
  const imageUrls = Array.isArray(parameters.referenceImages)
    ? parameters.referenceImages.filter(
        (item): item is string => typeof item === "string" && item.trim().length > 0,
      )
    : [];
  const imagePaths = Array.isArray(parameters.referenceImagePaths)
    ? parameters.referenceImagePaths.map((item) =>
        typeof item === "string" && item.trim().length > 0 ? item.trim() : ""
      )
    : [];

  const endFrameUrl = typeof parameters.endFrameImageUrl === "string"
    ? parameters.endFrameImageUrl
    : null;
  const endFramePath = typeof parameters.endFrameImagePath === "string" &&
    parameters.endFrameImagePath.trim().length > 0
    ? parameters.endFrameImagePath.trim()
    : null;
  if (endFrameUrl) {
    next.endFrameImageUrl = await refreshReferenceImageUrl(endFrameUrl, endFramePath);
  }

  if (imageUrls.length > 0) {
    const refreshed = await Promise.all(
      imageUrls.map((url, index) =>
        refreshReferenceImageUrl(url, imagePaths[index] || (index === 0 ? singlePath : null)),
      ),
    );
    next.referenceImages = refreshed;
    next.referenceImageUrl = refreshed[0] ?? singleUrl;
    return next;
  }

  if (singleUrl) {
    next.referenceImageUrl = await refreshReferenceImageUrl(singleUrl, singlePath);
  }

  return next;
}
