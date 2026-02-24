import { NavigationFrame } from "@/components/hud/NavigationFrame";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { ProjectWorkspace } from "@/components/generation/ProjectWorkspace";

type ProjectVideoPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProjectVideoPage({ params }: ProjectVideoPageProps) {
  const { id } = await params;

  return (
    <RequireAuth>
      <NavigationFrame title="SIGIL" modeLabel={`project / ${id} / video`} showNavPanel={false}>
        <ProjectWorkspace projectId={id} mode="video" />
      </NavigationFrame>
    </RequireAuth>
  );
}
