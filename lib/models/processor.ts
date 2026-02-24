/**
 * Generation processing dispatch abstraction.
 * Default: fire-and-forget HTTP to /api/generate/process.
 * When SIGIL_USE_QUEUE=true (future): push job to queue; worker consumes and calls process.
 * Keeps POST /api/generate response contract unchanged.
 */

export interface GenerationProcessor {
  enqueue(generationId: string, baseUrl: string): Promise<void>;
}

function createHttpProcessor(): GenerationProcessor {
  return {
    async enqueue(generationId: string, baseUrl: string): Promise<void> {
      const processUrl = new URL("/api/generate/process", baseUrl);
      try {
        await fetch(processUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ generationId }),
          cache: "no-store",
        });
      } catch {
        // Processing endpoint failures are reflected by stale processing status;
        // retry policies are added when queue is enabled.
      }
    },
  };
}

let instance: GenerationProcessor | null = null;

export function getProcessor(): GenerationProcessor {
  if (!instance) {
    const useQueue = process.env.SIGIL_USE_QUEUE === "true";
    instance = useQueue ? createHttpProcessor() : createHttpProcessor();
    // When queue is implemented: instance = useQueue ? createQueueProcessor() : createHttpProcessor();
  }
  return instance;
}
