import { redirect } from "next/navigation";
import { getAuthedUser } from "@/lib/auth/server";
import { getLockedJourneyHomeHref } from "@/lib/auth/workshop-redirect";
import { AnalyticsPageClient } from "./AnalyticsPageClient";

export default async function AnalyticsPage() {
  const user = await getAuthedUser();
  if (!user) redirect("/login");
  const workshopHome = await getLockedJourneyHomeHref(user.id);
  if (workshopHome) redirect(workshopHome);
  return <AnalyticsPageClient />;
}
