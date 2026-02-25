"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { CHANNEL_NAME, EVENT_GENERATION } from "@/lib/supabase/realtime";
import type { GenerationItem } from "@/components/generation/types";

function mapPayloadToItem(payload: {
  id: string;
  prompt: string;
  negativePrompt?: string | null;
  parameters?: Record<string, unknown>;
  status: string;
  modelId: string;
  createdAt: string;
  outputs?: Array<{
    id: string;
    fileUrl: string;
    fileType: string;
    isApproved?: boolean;
    width?: number | null;
    height?: number | null;
    duration?: number | null;
  }>;
}): GenerationItem {
  return {
    id: payload.id,
    prompt: payload.prompt,
    negativePrompt: payload.negativePrompt ?? null,
    parameters: payload.parameters ?? undefined,
    status: payload.status,
    modelId: payload.modelId,
    createdAt: payload.createdAt,
    outputs: payload.outputs ?? [],
  };
}

/**
 * Subscribe to Supabase Realtime generation updates for a session.
 * Calls onGenerationUpdate with each incoming generation; caller handles merge.
 */
export function useGenerationsRealtime(
  sessionId: string | null,
  onGenerationUpdate: (generation: GenerationItem) => void,
): void {
  const callbackRef = useRef(onGenerationUpdate);
  useEffect(() => {
    callbackRef.current = onGenerationUpdate;
  });

  useEffect(() => {
    if (!sessionId) return;

    const supabase = createClient();
    const channel = supabase.channel(CHANNEL_NAME);

    channel
      .on("broadcast", { event: EVENT_GENERATION }, ({ payload }) => {
        const { sessionId: payloadSessionId, generation } = payload as {
          sessionId: string;
          generation: Parameters<typeof mapPayloadToItem>[0];
        };
        if (payloadSessionId !== sessionId) return;
        callbackRef.current(mapPayloadToItem(generation));
      })
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          // Fallback to polling is handled by workspace
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [sessionId]);
}
