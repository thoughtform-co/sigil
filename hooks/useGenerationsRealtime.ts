"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { sessionChannelName, EVENT_GENERATION } from "@/lib/supabase/realtime";
import type { GenerationItem } from "@/components/generation/types";

function mapPayloadToItem(payload: {
  id: string;
  user?: {
    id: string;
    username?: string | null;
    displayName?: string | null;
  };
  prompt: string;
  negativePrompt?: string | null;
  parameters?: Record<string, unknown>;
  status: string;
  modelId: string;
  createdAt: string;
  source?: string;
  errorMessage?: string | null;
  errorCategory?: string | null;
  errorRetryable?: boolean | null;
  lastHeartbeatAt?: string | null;
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
    user: payload.user,
    prompt: payload.prompt,
    negativePrompt: payload.negativePrompt ?? null,
    parameters: payload.parameters ?? undefined,
    status: payload.status,
    modelId: payload.modelId,
    createdAt: payload.createdAt,
    source: payload.source,
    errorMessage: payload.errorMessage ?? null,
    errorCategory: payload.errorCategory ?? null,
    errorRetryable: payload.errorRetryable ?? null,
    lastHeartbeatAt: payload.lastHeartbeatAt ?? null,
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
    const channel = supabase.channel(sessionChannelName(sessionId));

    channel
      .on("broadcast", { event: EVENT_GENERATION }, ({ payload }) => {
        const { generation } = payload as {
          sessionId: string;
          generation: Parameters<typeof mapPayloadToItem>[0];
        };
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
