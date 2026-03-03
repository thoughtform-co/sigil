"use client";

import { createContext, useContext } from "react";
import useSWR from "swr";

type CountEntry = { count: number; hasProcessing: boolean };
type CountsMap = Record<string, CountEntry>;

const VideoIterationCountsContext = createContext<CountsMap | null>(null);

const EMPTY: CountEntry = { count: 0, hasProcessing: false };

async function fetcher(url: string): Promise<{ counts: CountsMap }> {
  const res = await fetch(url);
  if (!res.ok) return { counts: {} };
  return res.json();
}

export function VideoIterationCountsProvider({
  projectId,
  children,
}: {
  projectId: string;
  children: React.ReactNode;
}) {
  const { data } = useSWR(
    `/api/projects/${projectId}/video-iteration-counts`,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 30_000,
    },
  );

  return (
    <VideoIterationCountsContext.Provider value={data?.counts ?? null}>
      {children}
    </VideoIterationCountsContext.Provider>
  );
}

export function useVideoIterationCount(outputId: string | null): CountEntry {
  const counts = useContext(VideoIterationCountsContext);
  if (!outputId || !counts) return EMPTY;
  return counts[outputId] ?? EMPTY;
}
