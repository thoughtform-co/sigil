import { NavigationFrame } from "@/components/hud/NavigationFrame";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { ProjectWorkspace } from "@/components/generation/ProjectWorkspace";
import { prefetchWorkspaceData } from "@/lib/prefetch/workspace";

type RouteVideoPageProps = {
  params: Promise<{ id: string }>;
};

export default async function RouteVideoPage({ params }: RouteVideoPageProps) {
  const { id } = await params;
  const prefetch = await prefetchWorkspaceData(id);

  return (
    <RequireAuth>
      <NavigationFrame title="SIGIL" modeLabel={`route / ${id} / video`} workspaceLayout>
        <ProjectWorkspace projectId={id} mode="video" prefetchedData={prefetch} />
      </NavigationFrame>
    </RequireAuth>
  );
}
