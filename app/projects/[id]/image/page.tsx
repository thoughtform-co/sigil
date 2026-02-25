import { NavigationFrame } from "@/components/hud/NavigationFrame";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { ProjectWorkspace } from "@/components/generation/ProjectWorkspace";

type ProjectImagePageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProjectImagePage({ params }: ProjectImagePageProps) {
  const { id } = await params;

  return (
    <RequireAuth>
      <NavigationFrame title="SIGIL" modeLabel={`project / ${id} / image`} workspaceLayout>
        <ProjectWorkspace projectId={id} mode="image" />
      </NavigationFrame>
    </RequireAuth>
  );
}
