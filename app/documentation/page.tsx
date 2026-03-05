import { NavigationFrame } from "@/components/hud/NavigationFrame";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { HudPanel, HudPanelHeader, HudEmptyState } from "@/components/ui/hud";

export default function DocumentationPage() {
  return (
    <RequireAuth>
      <NavigationFrame title="SIGIL" modeLabel="documentation">
        <section className="w-full animate-fade-in-up" style={{ maxWidth: "var(--layout-content-sm, 960px)", paddingTop: "var(--space-2xl)" }}>
          <HudPanel>
            <HudPanelHeader title="Documentation" />
            <HudEmptyState title="Coming soon" body="Documentation will be available here." />
          </HudPanel>
        </section>
      </NavigationFrame>
    </RequireAuth>
  );
}
