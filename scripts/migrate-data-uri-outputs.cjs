#!/usr/bin/env node

/**
 * Migrate outputs stored as data: URIs to Supabase Storage.
 *
 * Gemini image generation returns inline base64 data. A bug in the process
 * route stored these directly in the DB instead of uploading to Storage.
 * This script finds all data-URI outputs, uploads them to the outputs bucket,
 * and updates the file_url to the public URL.
 *
 * Usage:
 *   node scripts/migrate-data-uri-outputs.cjs            # dry run
 *   node scripts/migrate-data-uri-outputs.cjs --write     # apply changes
 */

try {
  require("dotenv").config();
} catch {
  // Ignore if dotenv is unavailable.
}

const { PrismaClient } = require("@prisma/client");
const { createClient } = require("@supabase/supabase-js");

const EXT_MAP = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
};

async function ensureOutputsBucket(admin) {
  const { data: buckets, error } = await admin.storage.listBuckets();
  if (error) throw new Error(`Unable to list buckets: ${error.message}`);
  if (buckets.some((b) => b.id === "outputs" || b.name === "outputs")) return;
  const { error: createError } = await admin.storage.createBucket("outputs", { public: true });
  if (createError && !/already exists/i.test(createError.message)) {
    throw new Error(`Unable to create outputs bucket: ${createError.message}`);
  }
}

async function main() {
  const write = process.argv.includes("--write");
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRole) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  await ensureOutputsBucket(supabase);

  const prisma = new PrismaClient();
  const counters = { found: 0, uploaded: 0, failed: 0, skipped: 0 };

  try {
    const outputs = await prisma.$queryRaw`
      SELECT o.id, o.file_url, g.id AS generation_id, g.user_id
      FROM outputs o
      INNER JOIN generations g ON g.id = o.generation_id
      WHERE o.file_url LIKE 'data:%'
    `;

    counters.found = outputs.length;
    console.log(`${write ? "WRITE" : "DRY RUN"} — Found ${outputs.length} data-URI output(s)\n`);

    for (const row of outputs) {
      const dataUri = row.file_url;
      const commaIndex = dataUri.indexOf(",");
      if (commaIndex === -1) {
        console.log(`  [SKIP] ${row.id} — invalid data URI (no comma)`);
        counters.skipped++;
        continue;
      }

      const meta = dataUri.slice("data:".length, commaIndex);
      const base64Data = dataUri.slice(commaIndex + 1);
      const parts = meta.split(";").filter(Boolean);
      const mimeType = parts[0] || "image/png";
      const ext = EXT_MAP[mimeType] || "png";

      const buffer = Buffer.from(base64Data, "base64");
      const sizeMB = (buffer.length / 1024 / 1024).toFixed(1);
      const stringSizeMB = (dataUri.length / 1024 / 1024).toFixed(1);
      const path = `${row.user_id}/${row.generation_id}/output-${row.id}.${ext}`;

      console.log(`  ${row.id}: ${mimeType}, ${sizeMB}MB binary (${stringSizeMB}MB as base64) → ${path}`);

      if (!write) continue;

      const { error: uploadError } = await supabase.storage.from("outputs").upload(path, buffer, {
        upsert: true,
        contentType: mimeType,
        cacheControl: "31536000",
      });
      if (uploadError) {
        console.log(`    [FAIL] Upload error: ${uploadError.message}`);
        counters.failed++;
        continue;
      }

      const { data } = supabase.storage.from("outputs").getPublicUrl(path);
      await prisma.output.update({
        where: { id: row.id },
        data: { fileUrl: data.publicUrl },
      });

      console.log(`    [OK] → ${data.publicUrl}`);
      counters.uploaded++;
    }
  } finally {
    await prisma.$disconnect();
  }

  console.log("\nSummary:", JSON.stringify(counters));
  if (!write && counters.found > 0) {
    console.log("\nRun with --write to apply changes.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
