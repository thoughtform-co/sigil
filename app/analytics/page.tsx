import { NavigationFrame } from "@/components/hud/NavigationFrame";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AnalyticsOverview } from "@/components/analytics/AnalyticsOverview";

export default function AnalyticsPage() {
  return (
    <RequireAuth>
      <NavigationFrame title="SIGIL" modeLabel="analytics">
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
            generation analytics
          </h1>
          <AnalyticsOverview />
        </section>
      </NavigationFrame>
    </RequireAuth>
  );
}
