import { NavigationFrame } from "@/components/hud/NavigationFrame";
import { RequireAdmin } from "@/components/auth/RequireAdmin";
import { AdminHealthPanel } from "@/components/admin/AdminHealthPanel";
import { AllowedEmailsAdmin } from "@/components/admin/AllowedEmailsAdmin";
import { PromptEnhancementAdmin } from "@/components/admin/PromptEnhancementAdmin";
import { FailedGenerationsPanel } from "@/components/admin/FailedGenerationsPanel";

export default function AdminPage() {
  return (
    <RequireAdmin>
      <NavigationFrame title="SIGIL" modeLabel="admin" showNavPanel>
        <section
          className="w-full max-w-[960px] animate-fade-in-up"
          style={{ paddingTop: "var(--space-2xl)", paddingBottom: "var(--space-3xl)" }}
        >
          <h1
            className="sigil-section-label"
            style={{ marginBottom: "var(--space-xl)", fontSize: "11px" }}
          >
            System Settings
          </h1>

          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-xl)" }}>
            <AdminHealthPanel />
            <AllowedEmailsAdmin />
            <PromptEnhancementAdmin />
            <FailedGenerationsPanel />
          </div>
        </section>
      </NavigationFrame>
    </RequireAdmin>
  );
}
