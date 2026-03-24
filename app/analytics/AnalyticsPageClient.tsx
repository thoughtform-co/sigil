"use client";

import { NavigationFrame } from "@/components/hud/NavigationFrame";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AnalyticsOverview } from "@/components/analytics/AnalyticsOverview";
import { HudPanel, HudPanelHeader } from "@/components/ui/hud";

export function AnalyticsPageClient() {
  return (
    <RequireAuth>
      <NavigationFrame title="SIGIL" modeLabel="analytics">
        <section
          className="w-full animate-fade-in-up"
          style={{ maxWidth: "var(--layout-content-sm, 960px)", paddingTop: "var(--space-2xl)" }}
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
