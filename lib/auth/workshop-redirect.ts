import { getUserAccessContext, isWorkshopLockedParticipant } from "@/lib/auth/access-context";

/** If user is a workshop-locked participant, return `/journeys/{id}`; otherwise null. */
export async function getLockedJourneyHomeHref(userId: string): Promise<string | null> {
  const ctx = await getUserAccessContext(userId);
  if (!ctx || !isWorkshopLockedParticipant(ctx)) return null;
  return `/journeys/${ctx.lockedWorkspaceProjectId}`;
}
