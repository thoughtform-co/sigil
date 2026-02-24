"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export type VideoIterationOutput = {
  id: string;
  fileUrl: string;
  fileType: string;
  isApproved: boolean | null;
  width: number | null;
  height: number | null;
  duration: number | null;
};

export type VideoIteration = {
  id: string;
  prompt: string;
  parameters: Record<string, unknown>;
  status: string;
  modelId: string;
  createdAt: string;
  outputs: VideoIterationOutput[];
};

const POLL_INTERVAL_MS = 3000;

export function useVideoIterations(
  outputId: string | null,
  options?: { limit?: number; enabled?: boolean }
) {
  const { limit = 50, enabled = true } = options ?? {};
  const [iterations, setIterations] = useState<VideoIteration[]>([]);
  const [count, setCount] = useState(0);
  const [hasProcessing, setHasProcessing] = useState(false);
  const [latestStatus, setLatestStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasFetchedRef = useRef(false);

  const fetchIterations = useCallback(async () => {
    if (!outputId || !enabled) {
      setIterations([]);
      setCount(0);
      setHasProcessing(false);
      setLatestStatus(null);
      hasFetchedRef.current = false;
      return;
    }
    if (!hasFetchedRef.current) setLoading(true);
    setError(null);
    try {
      const url = `/api/outputs/${outputId}/video-iterations${limit ? `?limit=${limit}` : ""}`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Failed to load iterations");
      }
      const data = (await res.json()) as {
        iterations: VideoIteration[];
        count?: number;
        hasProcessing?: boolean;
        latestStatus?: string | null;
      };
      const list = data.iterations ?? [];
      setIterations(list);
      setCount(data.count ?? list.length);
      setHasProcessing(data.hasProcessing ?? list.some((i) => i.status === "processing" || i.status === "processing_locked"));
      setLatestStatus(data.latestStatus ?? list[0]?.status ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load iterations");
      setIterations([]);
      setCount(0);
      setHasProcessing(false);
      setLatestStatus(null);
    } finally {
      setLoading(false);
      hasFetchedRef.current = true;
    }
  }, [outputId, limit, enabled]);

  useEffect(() => {
    fetchIterations();
  }, [fetchIterations]);

  useEffect(() => {
    if (!outputId || !enabled || !hasProcessing) return;
    const t = setInterval(fetchIterations, POLL_INTERVAL_MS);
    return () => clearInterval(t);
  }, [outputId, enabled, hasProcessing, fetchIterations]);

  return {
    iterations,
    count,
    hasProcessing,
    latestStatus,
    loading,
    error,
    refetch: fetchIterations,
  };
}
