import { NavigationFrame } from "@/components/hud/NavigationFrame";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { ProjectWorkspace } from "@/components/generation/ProjectWorkspace";

type ProjectCanvasPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProjectCanvasPage({ params }: ProjectCanvasPageProps) {
  const { id } = await params;

  return (
    <RequireAuth>
      <NavigationFrame title="SIGIL" modeLabel={`project / ${id} / canvas`} workspaceLayout>
        <ProjectWorkspace projectId={id} mode="canvas" />
      </NavigationFrame>
    </RequireAuth>
  );
}
