import { NavigationFrame } from "@/components/hud/NavigationFrame";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { DashboardView } from "@/components/dashboard/DashboardView";

export default function DashboardPage() {
  return (
    <RequireAuth>
      <NavigationFrame title="SIGIL" modeLabel="dashboard" showNavPanel navSize="large">
        <DashboardView />
      </NavigationFrame>
    </RequireAuth>
  );
}
