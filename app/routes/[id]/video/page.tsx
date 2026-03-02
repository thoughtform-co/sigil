import { RouteModePage } from "@/components/generation/RouteModePage";

type RouteVideoPageProps = {
  params: Promise<{ id: string }>;
};

export default async function RouteVideoPage({ params }: RouteVideoPageProps) {
  const { id } = await params;
  return <RouteModePage projectId={id} mode="video" />;
}
