import { redirect } from "next/navigation";
import { NavigationFrame } from "@/components/hud/NavigationFrame";
import { DashboardView } from "@/components/dashboard/DashboardView";
import { getAuthedUser } from "@/lib/auth/server";
import { prefetchDashboard } from "@/lib/prefetch/dashboard";

export default async function DashboardPage() {
  const user = await getAuthedUser();
  if (!user) redirect("/login");

  const result = await prefetchDashboard(user.id);

  return (
    <NavigationFrame title="SIGIL" modeLabel="dashboard" workspaceLayout>
      <DashboardView
        initialData={result?.data}
        initialIsAdmin={result?.isAdmin}
      />
    </NavigationFrame>
  );
}
