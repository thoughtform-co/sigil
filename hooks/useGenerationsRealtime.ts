"use client";

import { useEffect } from "react";
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
 * Merges incoming generations into state by id; no polling needed while subscribed.
 */
export function useGenerationsRealtime(
  sessionId: string | null,
  setGenerations: React.Dispatch<React.SetStateAction<GenerationItem[]>>,
): void {
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
        setGenerations((prev) => {
          const next = prev.filter((g) => g.id !== generation.id);
          // Keep feed oldest->newest so new generations appear at the bottom.
          next.push(mapPayloadToItem(generation));
          next.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
          return next;
        });
      })
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          // Fallback to polling is handled by workspace keeping the poll when no realtime
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [sessionId, setGenerations]);
}
