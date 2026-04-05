"use client";

const MAX_IMAGE_UPLOAD_REQUEST_BYTES = 4 * 1024 * 1024;

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
 * Resize/recompress an image File so it stays under Vercel's function payload
 * limit when sent as multipart. Returns the original file untouched when it
 * already fits.
 */
export async function prepareImageFileForUpload(
  file: File,
  opts: { maxDim?: number; maxSizeBytes?: number; quality?: number } = {},
): Promise<File> {
  const {
    maxDim = 2048,
    maxSizeBytes = MAX_IMAGE_UPLOAD_REQUEST_BYTES,
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
      throw new Error("Reference image is too large to upload. Try a smaller image.");
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
 * Upload an image File to `/api/upload/reference-image` as multipart, with
 * client-side resize/recompress to stay under payload limits. Returns the
 * stored URL and optional storage path.
 */
export async function uploadReferenceImageMultipart(
  file: File,
  projectId: string,
): Promise<{ url: string; path?: string }> {
  const uploadFile = await prepareImageFileForUpload(file);
  const formData = new FormData();
  formData.append("file", uploadFile);
  formData.append("projectId", projectId);
  const res = await fetch("/api/upload/reference-image", {
    method: "POST",
    body: formData,
    credentials: "include",
  });
  const ct = res.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) {
    const text = await res.text();
    throw new Error(`Upload failed (${res.status}): ${text.slice(0, 120)}`);
  }
  const data = (await res.json()) as {
    url?: string;
    referenceImageUrl?: string;
    path?: string;
    error?: string;
  };
  if (!res.ok) throw new Error(data.error ?? "Upload failed");
  const url = data.referenceImageUrl ?? data.url;
  if (!url) throw new Error("Upload returned no URL");
  return { url, path: data.path };
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
