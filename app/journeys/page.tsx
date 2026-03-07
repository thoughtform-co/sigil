import { Suspense } from "react";
import { redirect } from "next/navigation";
import { NavigationFrame } from "@/components/hud/NavigationFrame";
import { DashboardView } from "@/components/dashboard/DashboardView";
import { getAuthedUser } from "@/lib/auth/server";
import { prefetchDashboard } from "@/lib/prefetch/dashboard";

async function JourneysWorkspaceContent() {
  const user = await getAuthedUser();
  if (!user) redirect("/login");

  const result = await prefetchDashboard(user.id, { includeThumbnails: false });

  return (
    <DashboardView
      initialData={result?.data}
      initialIsAdmin={result?.isAdmin}
      initialDataIncludesThumbnails={false}
    />
  );
}

export default function JourneysPage() {
  return (
    <NavigationFrame title="SIGIL" modeLabel="journeys" workspaceLayout>
      <Suspense
        fallback={
          <div className="flex items-center gap-3 py-12">
            <div style={{ width: 6, height: 6, background: "var(--gold)", animation: "glowPulse 1.5s ease-in-out infinite" }} />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--dawn-30)" }}>
              Loading journeys...
            </span>
          </div>
        }
      >
        <JourneysWorkspaceContent />
      </Suspense>
    </NavigationFrame>
  );
}
