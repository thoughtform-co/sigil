import { notFound } from "next/navigation";
import { getPublishedEvent } from "@/lib/workshop-registration";
import { PublicEventPage } from "@/components/workshop-registration/PublicEventPage";
import "@/components/workshop-registration/event-page.css";

type Params = Promise<{ slug: string }>;

export default async function EventPage({ params }: { params: Params }) {
  const { slug } = await params;
  const event = await getPublishedEvent(slug);
  if (!event) notFound();

  return <PublicEventPage event={event} />;
}
