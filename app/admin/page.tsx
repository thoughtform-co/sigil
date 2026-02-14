import { NavigationFrame } from "@/components/hud/NavigationFrame";
import { RequireAdmin } from "@/components/auth/RequireAdmin";
import { AdminHealthPanel } from "@/components/admin/AdminHealthPanel";
import { PromptEnhancementAdmin } from "@/components/admin/PromptEnhancementAdmin";
import { FailedGenerationsPanel } from "@/components/admin/FailedGenerationsPanel";

export default function AdminPage() {
  return (
    <RequireAdmin>
      <NavigationFrame title="SIGIL" modeLabel="admin">
        <section className="mx-auto max-w-5xl pt-12">
          <h1
            className="mb-4"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "14px",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            system settings
          </h1>
          <AdminHealthPanel />
          <div className="mt-4">
            <PromptEnhancementAdmin />
          </div>
          <div className="mt-4">
            <FailedGenerationsPanel />
          </div>
        </section>
      </NavigationFrame>
    </RequireAdmin>
  );
}
