import { createHash } from "crypto";
import { REFERENCES_BUCKET, uploadBase64ToStorage } from "@/lib/supabase/storage";

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
