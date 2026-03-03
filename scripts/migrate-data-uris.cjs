/**
 * Migrate inline data: URI outputs to Supabase Storage.
 *
 * Usage:
 *   node scripts/migrate-data-uris.cjs
 *
 * Requires DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL, and SUPABASE_SERVICE_ROLE_KEY
 * in .env or environment.
 */

require("dotenv").config({ path: ".env.local" });

const { PrismaClient } = require("@prisma/client");
const { createClient } = require("@supabase/supabase-js");

const BATCH_SIZE = 10;
const BUCKET = "outputs";

const prisma = new PrismaClient();
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

async function ensureBucket() {
  const { data } = await supabase.storage.listBuckets();
  if (!data?.some((b) => b.id === BUCKET)) {
    const { error } = await supabase.storage.createBucket(BUCKET, { public: true });
    if (error && !/already exists/i.test(error.message)) throw error;
  }
}

function parseDataUri(dataUri) {
  const commaIdx = dataUri.indexOf(",");
  if (commaIdx === -1) return null;
  const meta = dataUri.slice("data:".length, commaIdx);
  const parts = meta.split(";").filter(Boolean);
  const mimeType = parts[0] || "application/octet-stream";
  if (!parts.includes("base64")) return null;
  const base64 = dataUri.slice(commaIdx + 1);
  return { mimeType, base64 };
}

function extFromMime(mime) {
  if (mime.includes("png")) return "png";
  if (mime.includes("jpeg") || mime.includes("jpg")) return "jpg";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("gif")) return "gif";
  if (mime.includes("mp4")) return "mp4";
  return "bin";
}

async function main() {
  await ensureBucket();

  const total = await prisma.output.count({
    where: { fileUrl: { startsWith: "data:" } },
  });
  console.log(`Found ${total} outputs with data: URIs to migrate`);

  let migrated = 0;
  let failed = 0;
  let offset = 0;

  while (offset < total) {
    const batch = await prisma.output.findMany({
      where: { fileUrl: { startsWith: "data:" } },
      select: {
        id: true,
        fileUrl: true,
        generation: {
          select: { id: true, userId: true },
        },
      },
      take: BATCH_SIZE,
      orderBy: { createdAt: "asc" },
    });

    if (batch.length === 0) break;

    for (const output of batch) {
      const parsed = parseDataUri(output.fileUrl);
      if (!parsed) {
        console.warn(`  [skip] ${output.id} — invalid data URI format`);
        failed++;
        offset++;
        continue;
      }

      const ext = extFromMime(parsed.mimeType);
      const userId = output.generation?.userId ?? "unknown";
      const genId = output.generation?.id ?? "unknown";
      const path = `${userId}/${genId}/${output.id}.${ext}`;
      const buffer = Buffer.from(parsed.base64, "base64");

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, buffer, {
          contentType: parsed.mimeType,
          upsert: true,
          cacheControl: "31536000",
        });

      if (uploadError) {
        console.error(`  [fail] ${output.id} — ${uploadError.message}`);
        failed++;
        offset++;
        continue;
      }

      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      if (!data?.publicUrl) {
        console.error(`  [fail] ${output.id} — no public URL returned`);
        failed++;
        offset++;
        continue;
      }

      await prisma.output.update({
        where: { id: output.id },
        data: { fileUrl: data.publicUrl },
      });

      migrated++;
      offset++;
      console.log(`  [ok] ${output.id} → ${data.publicUrl.slice(0, 80)}... (${buffer.length} bytes)`);
    }

    console.log(`Progress: ${migrated} migrated, ${failed} failed, ${offset}/${total} processed`);
  }

  console.log(`\nDone. Migrated: ${migrated}, Failed: ${failed}, Total processed: ${offset}`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
