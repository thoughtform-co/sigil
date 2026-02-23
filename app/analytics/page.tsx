import { NavigationFrame } from "@/components/hud/NavigationFrame";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AnalyticsOverview } from "@/components/analytics/AnalyticsOverview";
import { HudPanel, HudPanelHeader } from "@/components/ui/hud";

export default function AnalyticsPage() {
  return (
    <RequireAuth>
      <NavigationFrame title="SIGIL" modeLabel="analytics" showNavPanel>
        <section
          className="w-full max-w-[960px] animate-fade-in-up"
          style={{ paddingTop: "var(--space-2xl)" }}
        >
          <HudPanel>
            <HudPanelHeader title="generation analytics" />
            <AnalyticsOverview />
          </HudPanel>
        </section>
      </NavigationFrame>
    </RequireAuth>
  );
}
