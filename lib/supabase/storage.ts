import { createAdminClient } from "@/lib/supabase/admin";

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

export async function uploadProviderOutput(params: {
  sourceUrl: string;
  userId: string;
  generationId: string;
  outputIndex: number;
  fileType: "image" | "video";
}): Promise<string> {
  const { sourceUrl, userId, generationId, outputIndex, fileType } = params;
  const admin = createAdminClient();

  const response = await fetch(sourceUrl);
  if (!response.ok) {
    throw new Error(`Failed downloading provider output: ${response.status} ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const ext = inferExtension(sourceUrl, fileType === "video" ? "mp4" : "png");
  const bucket = "outputs";
  const path = `${userId}/${generationId}/output-${outputIndex}.${ext}`;

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
