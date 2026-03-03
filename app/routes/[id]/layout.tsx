import { redirect } from "next/navigation";
import { NavigationFrame } from "@/components/hud/NavigationFrame";
import { getAuthedUser } from "@/lib/auth/server";
import { prefetchWorkspaceShell } from "@/lib/prefetch/workspace";
import { WorkspacePrefetchProvider } from "@/components/generation/WorkspacePrefetchProvider";
import { VideoIterationCountsProvider } from "@/components/generation/VideoIterationCountsContext";

type RouteLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
};

export default async function RouteLayout({ children, params }: RouteLayoutProps) {
  const user = await getAuthedUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const prefetch = await prefetchWorkspaceShell(id);

  return (
    <NavigationFrame
      title="SIGIL"
      modeLabel={`route / ${id}`}
      workspaceLayout
      journeyName={prefetch?.journeyName}
      journeyId={prefetch?.journeyId}
      routeName={prefetch?.projectName}
    >
      <WorkspacePrefetchProvider projectId={id} prefetchedData={prefetch}>
        <VideoIterationCountsProvider projectId={id}>
          {children}
        </VideoIterationCountsProvider>
      </WorkspacePrefetchProvider>
    </NavigationFrame>
  );
}
