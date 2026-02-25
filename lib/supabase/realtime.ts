import { createAdminClient } from "@/lib/supabase/admin";

const CHANNEL_NAME = "sigil:generations";
const EVENT_GENERATION = "generation";

export type BroadcastGenerationPayload = {
  sessionId: string;
  generation: {
    id: string;
    prompt: string;
    negativePrompt?: string | null;
    parameters?: Record<string, unknown>;
    status: string;
    modelId: string;
    createdAt: string;
    errorMessage?: string | null;
    errorCategory?: string | null;
    errorRetryable?: boolean | null;
    outputs?: Array<{
      id: string;
      fileUrl: string;
      fileType: string;
      isApproved?: boolean;
      width?: number | null;
      height?: number | null;
      duration?: number | null;
    }>;
  };
};

/**
 * Broadcast a generation update to Realtime so subscribed clients can update without polling.
 * Safe to call from API routes; runs fire-and-forget (no await).
 */
export function broadcastGenerationUpdate(payload: BroadcastGenerationPayload): void {
  try {
    const supabase = createAdminClient();
    const channel = supabase.channel(CHANNEL_NAME);
    channel.send({
      type: "broadcast",
      event: EVENT_GENERATION,
      payload,
    });
  } catch {
    // Realtime not configured or broadcast failed; clients fall back to polling
  }
}

export { CHANNEL_NAME, EVENT_GENERATION };
