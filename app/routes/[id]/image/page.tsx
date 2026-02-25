import { NavigationFrame } from "@/components/hud/NavigationFrame";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { ProjectWorkspace } from "@/components/generation/ProjectWorkspace";

type RouteImagePageProps = {
  params: Promise<{ id: string }>;
};

export default async function RouteImagePage({ params }: RouteImagePageProps) {
  const { id } = await params;

  return (
    <RequireAuth>
      <NavigationFrame title="SIGIL" modeLabel={`route / ${id} / image`} workspaceLayout>
        <ProjectWorkspace projectId={id} mode="image" />
      </NavigationFrame>
    </RequireAuth>
  );
}
