import { redirect } from "next/navigation";
import { NavigationFrame } from "@/components/hud/NavigationFrame";
import { DashboardView } from "@/components/dashboard/DashboardView";
import { getAuthedUser } from "@/lib/auth/server";
import { prefetchDashboard } from "@/lib/prefetch/dashboard";

export default async function DashboardPage() {
  const includeThumbnails = process.env.NODE_ENV === "production";
  const user = await getAuthedUser();
  if (!user) redirect("/login");

  const result = await prefetchDashboard(user.id, { includeThumbnails });

  return (
    <NavigationFrame title="SIGIL" modeLabel="dashboard" workspaceLayout>
      <DashboardView
        initialData={result?.data}
        initialIsAdmin={result?.isAdmin}
        initialDataIncludesThumbnails={includeThumbnails}
      />
    </NavigationFrame>
  );
}
