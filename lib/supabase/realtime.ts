import { createAdminClient } from "@/lib/supabase/admin";

const CHANNEL_PREFIX = "sigil:session:";
const EVENT_GENERATION = "generation";

export function sessionChannelName(sessionId: string): string {
  return `${CHANNEL_PREFIX}${sessionId}`;
}

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
 * Broadcast a generation update to the session-scoped Realtime channel.
 * Only clients subscribed to this specific session receive the update.
 */
export function broadcastGenerationUpdate(payload: BroadcastGenerationPayload): void {
  try {
    const supabase = createAdminClient();
    const channel = supabase.channel(sessionChannelName(payload.sessionId));
    channel.send({
      type: "broadcast",
      event: EVENT_GENERATION,
      payload,
    });
  } catch {
    // Realtime not configured or broadcast failed; clients fall back to polling
  }
}

export { EVENT_GENERATION };
