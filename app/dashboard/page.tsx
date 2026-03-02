import { redirect } from "next/navigation";
import { NavigationFrame } from "@/components/hud/NavigationFrame";
import { DashboardView } from "@/components/dashboard/DashboardView";
import { getAuthedUser } from "@/lib/auth/server";
import { prefetchDashboard } from "@/lib/prefetch/dashboard";

export default async function DashboardPage() {
  const pageStart = Date.now();
  const runId = `dashboard-page-${pageStart}`;
  const includeThumbnails = process.env.NODE_ENV === "production";
  // #region agent log
  void fetch('http://127.0.0.1:7607/ingest/a5f326c6-d7b4-482d-b1ae-86a7f55d4947',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'0e67a0'},body:JSON.stringify({sessionId:'0e67a0',runId,hypothesisId:'H3',location:'app/dashboard/page.tsx:start',message:'DashboardPage server render started',data:{nodeEnv:process.env.NODE_ENV,includeThumbnails},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  const user = await getAuthedUser();
  // #region agent log
  void fetch('http://127.0.0.1:7607/ingest/a5f326c6-d7b4-482d-b1ae-86a7f55d4947',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'0e67a0'},body:JSON.stringify({sessionId:'0e67a0',runId,hypothesisId:'H1',location:'app/dashboard/page.tsx:after-auth',message:'DashboardPage auth completed',data:{elapsedMs:Date.now()-pageStart,hasUser:Boolean(user)},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  if (!user) redirect("/login");

  const result = await prefetchDashboard(user.id, { includeThumbnails });
  // #region agent log
  void fetch('http://127.0.0.1:7607/ingest/a5f326c6-d7b4-482d-b1ae-86a7f55d4947',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'0e67a0'},body:JSON.stringify({sessionId:'0e67a0',runId,hypothesisId:'H2',location:'app/dashboard/page.tsx:after-prefetch',message:'DashboardPage prefetch completed',data:{elapsedMs:Date.now()-pageStart,hasResult:Boolean(result),journeyCount:result?.data?.journeys?.length??0},timestamp:Date.now()})}).catch(()=>{});
  // #endregion

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
