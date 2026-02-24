#!/usr/bin/env node

try {
  // Optional in case runtime does not preload env vars.
  require("dotenv").config();
} catch {
  // Ignore if dotenv is unavailable.
}

const { PrismaClient } = require("@prisma/client");
const { createClient } = require("@supabase/supabase-js");

function parseFlag(name, fallback) {
  const arg = process.argv.find((item) => item.startsWith(`${name}=`));
  if (!arg) return fallback;
  const raw = arg.slice(name.length + 1);
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function inferExtension(url, contentType) {
  try {
    const parsed = new URL(url);
    const filename = parsed.pathname.split("/").pop() || "";
    const ext = filename.includes(".") ? filename.split(".").pop() : "";
    if (ext && ext.length <= 5) return ext.toLowerCase();
  } catch {
    // Ignore parse failures and use content-type fallback below.
  }

  const type = (contentType || "").toLowerCase();
  if (type.includes("image/jpeg")) return "jpg";
  if (type.includes("image/png")) return "png";
  if (type.includes("image/webp")) return "webp";
  if (type.includes("image/gif")) return "gif";
  return "png";
}

async function ensureOutputsBucketExists(admin) {
  const { data: buckets, error: listError } = await admin.storage.listBuckets();
  if (listError) throw new Error(`Unable to list buckets: ${listError.message}`);

  const exists = buckets.some((bucket) => bucket.id === "outputs" || bucket.name === "outputs");
  if (exists) return;

  const { error: createError } = await admin.storage.createBucket("outputs", { public: true });
  if (createError && !/already exists/i.test(createError.message)) {
    throw new Error(`Unable to create outputs bucket: ${createError.message}`);
  }
}

async function main() {
  const write = process.argv.includes("--write");
  const limit = parseFlag("--limit", 200);
  const timeoutMs = parseFlag("--timeoutMs", 20000);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRole) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  const supabase = createClient(supabaseUrl, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  await ensureOutputsBucketExists(supabase);

  const storagePrefix = `${supabaseUrl.replace(/\/+$/, "")}/storage/v1/object/public/outputs/`;
  const prisma = new PrismaClient();

  const counters = {
    scanned: 0,
    fetched: 0,
    updated: 0,
    unreachable: 0,
    uploadFailed: 0,
    dbFailed: 0,
    skippedTooLarge: 0,
  };

  try {
    const outputs = await prisma.output.findMany({
      where: {
        fileType: "image",
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        fileUrl: true,
        generation: {
          select: {
            id: true,
            userId: true,
          },
        },
      },
    });

    const targets = outputs.filter((output) => {
      if (!output.fileUrl) return false;
      if (output.fileUrl.startsWith("data:")) return false;
      if (output.fileUrl.startsWith(storagePrefix)) return false;
      return true;
    });

    counters.scanned = targets.length;
    console.log(
      `${write ? "WRITE" : "DRY RUN"} mode. Candidate outputs: ${targets.length} (limit=${limit})`,
    );

    for (const output of targets) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      let response;

      try {
        response = await fetch(output.fileUrl, { signal: controller.signal });
      } catch {
        counters.unreachable += 1;
        clearTimeout(timeout);
        continue;
      }
      clearTimeout(timeout);

      if (!response.ok) {
        counters.unreachable += 1;
        continue;
      }

      counters.fetched += 1;

      const contentType = response.headers.get("content-type") || "image/png";
      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.length > 20 * 1024 * 1024) {
        counters.skippedTooLarge += 1;
        continue;
      }

      const ext = inferExtension(output.fileUrl, contentType);
      const path = `${output.generation.userId}/${output.generation.id}/output-backfill-${output.id}.${ext}`;

      if (!write) {
        continue;
      }

      const uploaded = await supabase.storage.from("outputs").upload(path, buffer, {
        upsert: true,
        contentType,
        cacheControl: "3600",
      });
      if (uploaded.error) {
        counters.uploadFailed += 1;
        continue;
      }

      const { data } = supabase.storage.from("outputs").getPublicUrl(path);
      try {
        await prisma.output.update({
          where: { id: output.id },
          data: { fileUrl: data.publicUrl },
        });
        counters.updated += 1;
      } catch {
        counters.dbFailed += 1;
      }
    }
  } finally {
    await prisma.$disconnect();
  }

  console.log("Backfill summary:");
  console.log(JSON.stringify(counters, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

