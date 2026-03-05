import { NavigationFrame } from "@/components/hud/NavigationFrame";
import { RequireAdmin } from "@/components/auth/RequireAdmin";
import { AdminHealthPanel } from "@/components/admin/AdminHealthPanel";
import { UserManagementAdmin } from "@/components/admin/UserManagementAdmin";
import { PromptEnhancementAdmin } from "@/components/admin/PromptEnhancementAdmin";
import { FailedGenerationsPanel } from "@/components/admin/FailedGenerationsPanel";

export default function AdminPage() {
  return (
    <RequireAdmin>
      <NavigationFrame title="SIGIL" modeLabel="admin">
        <section
          className="w-full animate-fade-in-up"
          style={{ maxWidth: "var(--layout-content-sm, 960px)", paddingTop: "var(--space-2xl)", paddingBottom: "var(--space-3xl)" }}
        >
          <h1
            className="sigil-section-label"
            style={{ marginBottom: "var(--space-xl)", fontSize: "11px" }}
          >
            System Settings
          </h1>

          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-xl)" }}>
            <AdminHealthPanel />
            <UserManagementAdmin />
            <PromptEnhancementAdmin />
            <FailedGenerationsPanel />
          </div>
        </section>
      </NavigationFrame>
    </RequireAdmin>
  );
}
