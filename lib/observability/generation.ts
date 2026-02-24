/**
 * Generation lifecycle observability hooks.
 * Add structured logging or metrics here without changing adapter/route logic.
 */

export type GenerationLifecycleEvent =
  | { type: "start"; generationId: string; modelId: string }
  | { type: "adapter_complete"; generationId: string; modelId: string; outputCount: number; durationMs?: number }
  | { type: "adapter_failed"; generationId: string; modelId: string; error: string }
  | { type: "upload_complete"; generationId: string }
  | { type: "persist_complete"; generationId: string; status: "completed" | "failed" };

export function observeGeneration(event: GenerationLifecycleEvent): void {
  if (process.env.NODE_ENV === "development") {
    // eslint-disable-next-line no-console
    console.log("[generation]", event.type, event);
  }
  // Future: send to metrics (e.g. increment counter, histogram for duration)
}
