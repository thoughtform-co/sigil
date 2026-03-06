import { Suspense } from "react";
import { redirect } from "next/navigation";
import { NavigationFrame } from "@/components/hud/NavigationFrame";
import { JourneyDetailContent } from "@/components/journeys/JourneyDetailContent";
import { getAuthedUser } from "@/lib/auth/server";
import { prefetchJourneyDetail } from "@/lib/prefetch/journeys";

async function JourneyContent({ id }: { id: string }) {
  const user = await getAuthedUser();
  if (!user) redirect("/login");

  const result = await prefetchJourneyDetail(user.id, id);

  return (
    <JourneyDetailContent
      key={id}
      id={id}
      initialData={result?.data}
      initialIsAdmin={result?.isAdmin}
    />
  );
}

export default async function JourneyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await getAuthedUser();
  const result = user ? await prefetchJourneyDetail(user.id, id) : null;
  const journeyName = result?.data?.journey.name;

  return (
    <NavigationFrame
      title="SIGIL"
      modeLabel="journey"
      journeyName={journeyName}
      journeyId={id}
    >
      <Suspense
        fallback={
          <div className="flex items-center gap-3 py-12">
            <div style={{ width: 6, height: 6, background: "var(--gold)", animation: "glowPulse 1.5s ease-in-out infinite" }} />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--dawn-30)" }}>
              Loading journey...
            </span>
          </div>
        }
      >
        <JourneyContent id={id} />
      </Suspense>
    </NavigationFrame>
  );
}
