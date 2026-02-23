import { NavigationFrame } from "@/components/hud/NavigationFrame";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { ProjectWorkspace } from "@/components/generation/ProjectWorkspace";

type ProjectPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProjectDetailPage({ params }: ProjectPageProps) {
  const { id } = await params;

  return (
    <RequireAuth>
      <NavigationFrame title="SIGIL" modeLabel={`project / ${id}`} showNavPanel={false}>
        <ProjectWorkspace projectId={id} />
      </NavigationFrame>
    </RequireAuth>
  );
}
