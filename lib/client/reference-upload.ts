"use client";

import { createClient } from "@/lib/supabase/client";

const REFERENCES_BUCKET = "references";
const MAX_REFERENCE_IMAGE_BYTES = 25 * 1024 * 1024;
const MAX_REFERENCE_IMAGE_DIM = 4096;

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
        return;
      }
      reject(new Error("Failed to encode image for upload."));
    }, type, quality);
  });
}

/**
 * Resize/recompress a reference image only when it is extremely large.
 * With direct-to-storage uploads we no longer need to squeeze images under the
 * Vercel function payload limit, but we still keep a practical ceiling to avoid
 * pathological browser memory usage and provider fetch failures.
 */
export async function prepareImageFileForUpload(
  file: File,
  opts: { maxDim?: number; maxSizeBytes?: number; quality?: number } = {},
): Promise<File> {
  const {
    maxDim = MAX_REFERENCE_IMAGE_DIM,
    maxSizeBytes = MAX_REFERENCE_IMAGE_BYTES,
    quality: initQuality = 0.85,
  } = opts;
  if (!file.type.startsWith("image/")) {
    throw new Error("Reference upload source is not an image.");
  }

  const objectUrl = URL.createObjectURL(file);
  const img = new Image();
  try {
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Failed to decode image for upload."));
      img.src = objectUrl;
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }

  let { width, height } = img;
  if (!width || !height) {
    throw new Error("Reference image is empty or unreadable.");
  }
  const needsResize = width > maxDim || height > maxDim;
  if (!needsResize && file.size <= maxSizeBytes) {
    return file;
  }

  if (needsResize) {
    const ratio = maxDim / Math.max(width, height);
    width = Math.max(1, Math.floor(width * ratio));
    height = Math.max(1, Math.floor(height * ratio));
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    canvas.width = 0;
    canvas.height = 0;
    throw new Error("Failed to prepare reference image for upload.");
  }

  try {
    ctx.drawImage(img, 0, 0, width, height);
    let quality = initQuality;
    let attempts = 0;
    let encoded = await canvasToBlob(canvas, "image/jpeg", quality);
    while (encoded.size > maxSizeBytes && attempts < 5 && quality > 0.45) {
      quality = Math.max(0.45, quality - 0.1);
      encoded = await canvasToBlob(canvas, "image/jpeg", quality);
      attempts++;
    }
    if (encoded.size > maxSizeBytes) {
      throw new Error(
        `Reference image is too large to upload. Try an image under ${Math.round(maxSizeBytes / (1024 * 1024))}MB.`,
      );
    }
    return new File(
      [encoded],
      `${file.name.replace(/\.[^.]+$/, "") || "reference"}.jpg`,
      { type: "image/jpeg" },
    );
  } finally {
    canvas.width = 0;
    canvas.height = 0;
  }
}

/**
 * Upload an image File directly to Supabase Storage using a short-lived signed
 * upload URL minted by the server. This avoids Vercel function request-body
 * limits for prompt-bar reference images.
 */
export async function uploadReferenceImageMultipart(
  file: File,
  projectId: string,
): Promise<{ url: string; path?: string }> {
  const uploadFile = await prepareImageFileForUpload(file);
  const prepareRes = await fetch("/api/upload/reference-image/direct", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "prepare",
      mimeType: uploadFile.type || "image/jpeg",
      projectId: projectId || undefined,
    }),
    credentials: "include",
  });
  const prepareCt = prepareRes.headers.get("content-type") ?? "";
  if (!prepareCt.includes("application/json")) {
    const text = await prepareRes.text();
    throw new Error(`Upload prepare failed (${prepareRes.status}): ${text.slice(0, 120)}`);
  }
  const prepareData = (await prepareRes.json()) as {
    bucket?: string;
    path?: string;
    token?: string;
    referenceImageId?: string;
    error?: string;
  };
  if (!prepareRes.ok) throw new Error(prepareData.error ?? "Upload prepare failed");
  if (!prepareData.path || !prepareData.token) {
    throw new Error("Upload prepare returned no storage target.");
  }

  const supabase = createClient();
  const { error: directUploadError } = await supabase.storage
    .from(prepareData.bucket ?? REFERENCES_BUCKET)
    .uploadToSignedUrl(prepareData.path, prepareData.token, uploadFile, {
      upsert: true,
      cacheControl: "31536000",
      contentType: uploadFile.type || "image/jpeg",
    });
  if (directUploadError) {
    throw new Error(directUploadError.message);
  }

  const completeRes = await fetch("/api/upload/reference-image/direct", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "complete",
      path: prepareData.path,
      referenceImageId: prepareData.referenceImageId,
    }),
    credentials: "include",
  });
  const completeCt = completeRes.headers.get("content-type") ?? "";
  if (!completeCt.includes("application/json")) {
    const text = await completeRes.text();
    throw new Error(`Upload finalize failed (${completeRes.status}): ${text.slice(0, 120)}`);
  }
  const completeData = (await completeRes.json()) as {
    url?: string;
    referenceImageUrl?: string;
    path?: string;
    error?: string;
  };
  if (!completeRes.ok) throw new Error(completeData.error ?? "Upload finalize failed");
  const url = completeData.referenceImageUrl ?? completeData.url;
  if (!url) throw new Error("Upload returned no URL");
  return { url, path: completeData.path ?? prepareData.path };
}

/**
 * Convert a `data:` URL to a File, then upload via multipart.
 */
export async function uploadDataUrlAsMultipart(
  dataUrl: string,
  projectId: string,
): Promise<{ url: string; path?: string }> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  if (!blob.type.startsWith("image/")) {
    throw new Error("Reference data URL is not an image.");
  }
  const ext = blob.type.includes("png") ? "png" : blob.type.includes("webp") ? "webp" : "jpg";
  const file = new File([blob], `reference.${ext}`, { type: blob.type || "image/jpeg" });
  return uploadReferenceImageMultipart(file, projectId);
}
