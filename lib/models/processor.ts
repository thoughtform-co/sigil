/**
 * Generation processing dispatch with bounded retry.
 * Default: HTTP POST to /api/generate/process with retry on transient failures.
 * If all retries fail, the generation is marked as failed in the DB so it never
 * silently hangs in "processing" forever.
 */

import { prisma } from "@/lib/prisma";

const MAX_ENQUEUE_RETRIES = 3;
const RETRY_DELAY_MS = 1500;

export interface GenerationProcessor {
  enqueue(
    generationId: string,
    baseUrl: string,
    options?: { cookie?: string | null }
  ): Promise<void>;
}

async function markEnqueueFailed(generationId: string, reason: string): Promise<void> {
  try {
    await prisma.generation.updateMany({
      where: { id: generationId, status: { in: ["processing", "processing_locked"] } },
      data: {
        status: "failed",
        errorMessage: reason,
        errorCategory: "worker_dispatch",
        errorRetryable: true,
      },
    });
  } catch (dbErr) {
    console.error(`[processor] Failed to mark ${generationId} as failed:`, dbErr);
  }
}

function createHttpProcessor(): GenerationProcessor {
  return {
    async enqueue(
      generationId: string,
      baseUrl: string,
      options?: { cookie?: string | null }
    ): Promise<void> {
      const processUrl = new URL("/api/generate/process", baseUrl);
      let lastError: unknown;

      for (let attempt = 0; attempt <= MAX_ENQUEUE_RETRIES; attempt++) {
        try {
          const headers: Record<string, string> = { "Content-Type": "application/json" };
          if (options?.cookie) {
            headers.Cookie = options.cookie;
          }

          const res = await fetch(processUrl, {
            method: "POST",
            headers,
            body: JSON.stringify({ generationId }),
          });
          if (res.ok) return;
          const responseText = await res.text().catch(() => "");
          lastError = new Error(
            `Process endpoint returned ${res.status}${responseText ? `: ${responseText.slice(0, 200)}` : ""}`
          );
        } catch (err) {
          lastError = err;
        }

        if (attempt < MAX_ENQUEUE_RETRIES) {
          console.warn(
            `[processor] Enqueue attempt ${attempt + 1} failed for ${generationId}, retrying in ${RETRY_DELAY_MS}ms...`,
            lastError instanceof Error ? lastError.message : lastError,
          );
          await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * (attempt + 1)));
        }
      }

      const errorMsg = lastError instanceof Error ? lastError.message : String(lastError ?? "unknown");
      console.error(
        `[processor] Enqueue failed after ${MAX_ENQUEUE_RETRIES + 1} attempts for ${generationId}: ${errorMsg}`,
      );
      await markEnqueueFailed(
        generationId,
        "Failed to start generation worker after multiple attempts. Please retry.",
      );
    },
  };
}

let instance: GenerationProcessor | null = null;

export function getProcessor(): GenerationProcessor {
  if (!instance) {
    instance = createHttpProcessor();
  }
  return instance;
}
