import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Storage: outputs (generated media) + references (uploaded reference images).
 * - outputs: {userId}/{generationId}/output-{index}.{ext}
 * - references: references/{userId}/{refId}.{ext} — Vesper parity for stable reference URLs.
 */

export const REFERENCES_BUCKET = "references";
let outputsBucketReady: Promise<void> | null = null;
let referencesBucketReady: Promise<void> | null = null;

function inferExtension(fileUrl: string, fallback: "png" | "mp4"): string {
  try {
    const url = new URL(fileUrl);
    const parts = url.pathname.split(".");
    const ext = parts[parts.length - 1];
    if (ext && ext.length <= 5) return ext.toLowerCase();
  } catch {
    // Ignore URL parsing issues and use fallback.
  }
  return fallback;
}

async function ensureOutputsBucketExists(admin: ReturnType<typeof createAdminClient>): Promise<void> {
  const bucket = "outputs";
  const { data: buckets, error: listError } = await admin.storage.listBuckets();
  if (listError) {
    throw new Error(`Unable to list storage buckets: ${listError.message}`);
  }

  const hasOutputsBucket = buckets.some((item) => item.id === bucket || item.name === bucket);
  if (hasOutputsBucket) return;

  const { error: createError } = await admin.storage.createBucket(bucket, {
    public: true,
  });
  if (createError && !/already exists/i.test(createError.message)) {
    throw new Error(`Unable to create storage bucket "${bucket}": ${createError.message}`);
  }
}

async function ensureReferencesBucketExists(admin: ReturnType<typeof createAdminClient>): Promise<void> {
  const bucket = REFERENCES_BUCKET;
  const { data: buckets, error: listError } = await admin.storage.listBuckets();
  if (listError) {
    throw new Error(`Unable to list storage buckets: ${listError.message}`);
  }
  const exists = buckets.some((item) => item.id === bucket || item.name === bucket);
  if (exists) return;
  const { error: createError } = await admin.storage.createBucket(bucket, { public: true });
  if (createError && !/already exists/i.test(createError.message)) {
    throw new Error(`Unable to create storage bucket "${bucket}": ${createError.message}`);
  }
}

/**
 * Upload base64 data URL to Supabase Storage (Vesper parity).
 * Used for reference images so generation receives stable public URLs.
 */
export async function uploadBase64ToStorage(
  base64DataUrl: string,
  bucket: string,
  path: string,
  opts?: { cacheControl?: string }
): Promise<string> {
  if (typeof base64DataUrl !== "string" || !base64DataUrl.startsWith("data:")) {
    throw new Error("Invalid base64 data URL format");
  }
  const commaIndex = base64DataUrl.indexOf(",");
  if (commaIndex === -1) throw new Error("Invalid base64 data URL format");
  const meta = base64DataUrl.slice("data:".length, commaIndex);
  const base64Data = base64DataUrl.slice(commaIndex + 1);
  const parts = meta.split(";").filter(Boolean);
  const mimeType = parts[0] || "application/octet-stream";
  if (!parts.includes("base64")) throw new Error("Invalid base64 data URL format");
  const buffer = Buffer.from(base64Data, "base64");
  const admin = createAdminClient();
  if (bucket === REFERENCES_BUCKET) {
    referencesBucketReady ??= ensureReferencesBucketExists(admin);
    await referencesBucketReady;
  }
  const { error } = await admin.storage.from(bucket).upload(path, buffer, {
    contentType: mimeType,
    upsert: true,
    cacheControl: opts?.cacheControl ?? "3600",
  });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);
  const { data } = admin.storage.from(bucket).getPublicUrl(path);
  if (!data.publicUrl) throw new Error("Supabase public URL generation failed");
  return data.publicUrl;
}

export async function uploadProviderOutput(params: {
  sourceUrl: string;
  userId: string;
  generationId: string;
  outputIndex: number;
  fileType: "image" | "video";
  /** Optional fetch headers (e.g. for Veo gs:// or authenticated URLs) */
  fetchHeaders?: Record<string, string>;
}): Promise<string> {
  const { sourceUrl, userId, generationId, outputIndex, fileType, fetchHeaders } = params;
  const admin = createAdminClient();
  outputsBucketReady ??= ensureOutputsBucketExists(admin);
  await outputsBucketReady;

  let fetchUrl = sourceUrl;
  if (sourceUrl.startsWith("gs://")) {
    const gsPath = sourceUrl.replace("gs://", "");
    const [bucketName, ...pathParts] = gsPath.split("/");
    const filePath = pathParts.join("/");
    fetchUrl = `https://storage.googleapis.com/${bucketName}/${filePath}`;
  }

  const response = await fetch(fetchUrl, {
    headers: { "User-Agent": "Mozilla/5.0", ...fetchHeaders },
  });
  if (!response.ok) {
    throw new Error(`Failed downloading provider output: ${response.status} ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const ext = inferExtension(sourceUrl, fileType === "video" ? "mp4" : "png");
  const bucket = "outputs";
  const path = `${userId}/${generationId}/output-${outputIndex}.${ext}`; /* single bucket, path encodes type via ext */

  const uploadResult = await admin.storage.from(bucket).upload(path, buffer, {
    upsert: true,
    contentType: response.headers.get("content-type") || (fileType === "video" ? "video/mp4" : "image/png"),
    cacheControl: "3600",
  });

  if (uploadResult.error) {
    throw new Error(`Supabase upload failed: ${uploadResult.error.message}`);
  }

  const { data } = admin.storage.from(bucket).getPublicUrl(path);
  if (!data.publicUrl) {
    throw new Error("Supabase public URL generation failed");
  }
  return data.publicUrl;
}
