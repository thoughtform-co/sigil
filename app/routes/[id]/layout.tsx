import { NavigationFrame } from "@/components/hud/NavigationFrame";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { prefetchWorkspaceData } from "@/lib/prefetch/workspace";
import { WorkspacePrefetchProvider } from "@/components/generation/WorkspacePrefetchProvider";

type RouteLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
};

export default async function RouteLayout({ children, params }: RouteLayoutProps) {
  const { id } = await params;
  const prefetch = await prefetchWorkspaceData(id);

  return (
    <RequireAuth>
      <NavigationFrame title="SIGIL" modeLabel={`route / ${id}`} workspaceLayout>
        <WorkspacePrefetchProvider projectId={id} prefetchedData={prefetch}>
          {children}
        </WorkspacePrefetchProvider>
      </NavigationFrame>
    </RequireAuth>
  );
}
