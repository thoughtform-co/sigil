import { redirect } from "next/navigation";
import { getAuthedUser } from "@/lib/auth/server";
import { getLockedJourneyHomeHref } from "@/lib/auth/workshop-redirect";
import { ProjectsPageClient } from "./ProjectsPageClient";

export default async function ProjectsPage() {
  const user = await getAuthedUser();
  if (!user) redirect("/login");
  const workshopHome = await getLockedJourneyHomeHref(user.id);
  if (workshopHome) redirect(workshopHome);
  return <ProjectsPageClient />;
}
