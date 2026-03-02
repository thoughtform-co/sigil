import { redirect } from "next/navigation";
import { NavigationFrame } from "@/components/hud/NavigationFrame";
import { JourneyDetailContent } from "@/components/journeys/JourneyDetailContent";
import { getAuthedUser } from "@/lib/auth/server";
import { prefetchJourneyDetail } from "@/lib/prefetch/journeys";

export default async function JourneyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getAuthedUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const result = await prefetchJourneyDetail(user.id, id);

  return (
    <NavigationFrame title="SIGIL" modeLabel="journey">
      <JourneyDetailContent
        key={id}
        id={id}
        initialData={result?.data}
        initialIsAdmin={result?.isAdmin}
      />
    </NavigationFrame>
  );
}
