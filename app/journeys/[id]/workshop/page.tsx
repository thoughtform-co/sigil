import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getAuthedUser } from "@/lib/auth/server";
import { getLockedJourneyHomeHref } from "@/lib/auth/workshop-redirect";
import { prefetchJourneyDetail } from "@/lib/prefetch/journeys";
import { parseBrandedSettings, defaultBrandedSettings } from "@/lib/workshops/types";
import { BrandedWorkshopFrame } from "@/components/workshops/BrandedWorkshopFrame";
import { BrandedWorkshopPage } from "@/components/workshops/BrandedWorkshopPage";

async function WorkshopContent({ id }: { id: string }) {
  const user = await getAuthedUser();
  if (!user) redirect("/login");

  const result = await prefetchJourneyDetail(user.id, id);
  if (!result) {
    const home = await getLockedJourneyHomeHref(user.id);
    redirect(home ?? "/journeys");
  }

  const { data } = result;
  if (data.journey.type !== "branded") redirect(`/journeys/${id}`);

  const settings = parseBrandedSettings(data.journey.settings) ?? defaultBrandedSettings();

  return (
    <BrandedWorkshopPage
      settings={settings}
      journeyName={data.journey.name}
    />
  );
}

export default async function WorkshopPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <BrandedWorkshopFrame>
      <Suspense
        fallback={
          <div
            style={{
              minHeight: "100vh",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
            }}
          >
            <div
              style={{
                width: 6,
                height: 6,
                background: "var(--gold)",
                animation: "glowPulse 1.5s ease-in-out infinite",
              }}
            />
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "10px",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--dawn-30)",
              }}
            >
              Loading workshop...
            </span>
          </div>
        }
      >
        <WorkshopContent id={id} />
      </Suspense>
    </BrandedWorkshopFrame>
  );
}
