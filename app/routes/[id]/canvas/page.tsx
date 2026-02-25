import { NavigationFrame } from "@/components/hud/NavigationFrame";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { ProjectWorkspace } from "@/components/generation/ProjectWorkspace";

type RouteCanvasPageProps = {
  params: Promise<{ id: string }>;
};

export default async function RouteCanvasPage({ params }: RouteCanvasPageProps) {
  const { id } = await params;

  return (
    <RequireAuth>
      <NavigationFrame title="SIGIL" modeLabel={`route / ${id} / canvas`} workspaceLayout>
        <ProjectWorkspace projectId={id} mode="canvas" />
      </NavigationFrame>
    </RequireAuth>
  );
}
