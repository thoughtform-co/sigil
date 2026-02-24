import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Single-bucket storage for generated media (Sigil strategy).
 * All image and video outputs go into the "outputs" bucket.
 * Path convention: {userId}/{generationId}/output-{index}.{ext}
 * - Images: .png, .jpg, .webp, etc.
 * - Videos: .mp4
 * No separate buckets for image vs video; type is implied by extension and fileType.
 */

let outputsBucketReady: Promise<void> | null = null;

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

export async function uploadProviderOutput(params: {
  sourceUrl: string;
  userId: string;
  generationId: string;
  outputIndex: number;
  fileType: "image" | "video";
}): Promise<string> {
  const { sourceUrl, userId, generationId, outputIndex, fileType } = params;
  const admin = createAdminClient();
  outputsBucketReady ??= ensureOutputsBucketExists(admin);
  await outputsBucketReady;

  const response = await fetch(sourceUrl);
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
