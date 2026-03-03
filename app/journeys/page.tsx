import { redirect } from "next/navigation";
import { NavigationFrame } from "@/components/hud/NavigationFrame";
import { JourneysOverviewContent } from "@/components/journeys/JourneysOverviewContent";
import { getAuthedUser } from "@/lib/auth/server";
import { prefetchJourneysList } from "@/lib/prefetch/journeys";

export default async function JourneysPage() {
  const user = await getAuthedUser();
  if (!user) redirect("/login");

  const result = await prefetchJourneysList(user.id, { includeThumbnails: false });

  return (
    <NavigationFrame title="SIGIL" modeLabel="journeys">
      <JourneysOverviewContent
        initialJourneys={result?.journeys}
        initialIsAdmin={result?.isAdmin}
        initialDataIncludesThumbnails={false}
      />
    </NavigationFrame>
  );
}
