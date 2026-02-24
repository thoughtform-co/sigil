import { NavigationFrame } from "@/components/hud/NavigationFrame";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { ProjectWorkspace } from "@/components/generation/ProjectWorkspace";

type RouteVideoPageProps = {
  params: Promise<{ id: string }>;
};

export default async function RouteVideoPage({ params }: RouteVideoPageProps) {
  const { id } = await params;

  return (
    <RequireAuth>
      <NavigationFrame title="SIGIL" modeLabel={`route / ${id} / video`} showNavPanel={false}>
        <ProjectWorkspace projectId={id} mode="video" />
      </NavigationFrame>
    </RequireAuth>
  );
}
