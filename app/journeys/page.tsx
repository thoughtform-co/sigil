import { redirect } from "next/navigation";
import { NavigationFrame } from "@/components/hud/NavigationFrame";
import { JourneysOverviewContent } from "@/components/journeys/JourneysOverviewContent";
import { getAuthedUser } from "@/lib/auth/server";
import { prefetchJourneysList } from "@/lib/prefetch/journeys";

export const dynamic = "force-dynamic";

export default async function JourneysPage() {
  const user = await getAuthedUser();
  if (!user) redirect("/login");

  const result = await prefetchJourneysList(user.id);

  return (
    <NavigationFrame title="SIGIL" modeLabel="journeys">
      <JourneysOverviewContent
        initialJourneys={result?.journeys}
        initialIsAdmin={result?.isAdmin}
        initialDataIncludesThumbnails={true}
      />
    </NavigationFrame>
  );
}
