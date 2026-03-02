"use client";

import { createContext, useContext } from "react";
import type { PrefetchedWorkspaceData } from "@/lib/prefetch/workspace";

type WorkspacePrefetchContextValue = {
  projectId: string;
  prefetchedData: PrefetchedWorkspaceData;
};

const WorkspacePrefetchContext = createContext<WorkspacePrefetchContextValue | null>(null);

export function WorkspacePrefetchProvider({
  projectId,
  prefetchedData,
  children,
}: {
  projectId: string;
  prefetchedData: PrefetchedWorkspaceData;
  children: React.ReactNode;
}) {
  return (
    <WorkspacePrefetchContext.Provider value={{ projectId, prefetchedData }}>
      {children}
    </WorkspacePrefetchContext.Provider>
  );
}

export function useWorkspacePrefetch() {
  return useContext(WorkspacePrefetchContext);
}
