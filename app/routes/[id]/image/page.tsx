import { NavigationFrame } from "@/components/hud/NavigationFrame";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { ProjectWorkspace } from "@/components/generation/ProjectWorkspace";
import { prefetchWorkspaceData } from "@/lib/prefetch/workspace";

type RouteImagePageProps = {
  params: Promise<{ id: string }>;
};

export default async function RouteImagePage({ params }: RouteImagePageProps) {
  const { id } = await params;
  const prefetch = await prefetchWorkspaceData(id);

  return (
    <RequireAuth>
      <NavigationFrame title="SIGIL" modeLabel={`route / ${id} / image`} workspaceLayout>
        <ProjectWorkspace projectId={id} mode="image" prefetchedData={prefetch} />
      </NavigationFrame>
    </RequireAuth>
  );
}
