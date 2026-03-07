import { Suspense } from "react";
import { redirect } from "next/navigation";
import { NavigationFrame } from "@/components/hud/NavigationFrame";
import { HomeLanding } from "@/components/home/HomeLanding";
import { getAuthedUser } from "@/lib/auth/server";

async function HomeContent() {
  const user = await getAuthedUser();
  if (!user) redirect("/login");

  return <HomeLanding />;
}

export default function HomePage() {
  return (
    <NavigationFrame title="SIGIL" modeLabel="home">
      <Suspense
        fallback={
          <div className="flex items-center gap-3 py-12">
            <div style={{ width: 6, height: 6, background: "var(--gold)", animation: "glowPulse 1.5s ease-in-out infinite" }} />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--dawn-30)" }}>
              Loading...
            </span>
          </div>
        }
      >
        <HomeContent />
      </Suspense>
    </NavigationFrame>
  );
}
