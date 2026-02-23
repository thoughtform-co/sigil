import { NavigationFrame } from "@/components/hud/NavigationFrame";
import { RequireAdmin } from "@/components/auth/RequireAdmin";
import { AdminHealthPanel } from "@/components/admin/AdminHealthPanel";
import { PromptEnhancementAdmin } from "@/components/admin/PromptEnhancementAdmin";
import { FailedGenerationsPanel } from "@/components/admin/FailedGenerationsPanel";
import { HudPanel, HudPanelHeader } from "@/components/ui/hud";

export default function AdminPage() {
  return (
    <RequireAdmin>
      <NavigationFrame title="SIGIL" modeLabel="admin" showNavPanel>
        <section
          className="w-full max-w-[960px] animate-fade-in-up"
          style={{ paddingTop: "var(--space-2xl)" }}
        >
          <HudPanel>
            <HudPanelHeader title="system settings" />
            <AdminHealthPanel />
            <div style={{ marginTop: "var(--space-xl)" }}>
              <PromptEnhancementAdmin />
            </div>
            <div style={{ marginTop: "var(--space-xl)" }}>
              <FailedGenerationsPanel />
            </div>
          </HudPanel>
        </section>
      </NavigationFrame>
    </RequireAdmin>
  );
}
