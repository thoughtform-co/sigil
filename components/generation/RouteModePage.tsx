"use client";

import { ProjectWorkspace } from "@/components/generation/ProjectWorkspace";
import { useWorkspacePrefetch } from "@/components/generation/WorkspacePrefetchProvider";
import type { GenerationType } from "@/components/generation/types";

export function RouteModePage({ projectId, mode }: { projectId: string; mode: GenerationType }) {
  const ctx = useWorkspacePrefetch();
  return (
    <ProjectWorkspace
      projectId={projectId}
      mode={mode}
      prefetchedData={ctx?.prefetchedData}
    />
  );
}
