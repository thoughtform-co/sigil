/**
 * Generation processing dispatch with bounded retry.
 * Default: HTTP POST to /api/generate/process with retry on transient failures.
 */

const MAX_ENQUEUE_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

export interface GenerationProcessor {
  enqueue(
    generationId: string,
    baseUrl: string,
    options?: { cookie?: string | null }
  ): Promise<void>;
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
            cache: "no-store",
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

      console.error(
        `[processor] Enqueue failed after ${MAX_ENQUEUE_RETRIES + 1} attempts for ${generationId}:`,
        lastError instanceof Error ? lastError.message : lastError,
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
