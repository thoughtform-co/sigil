import { RouteModePage } from "@/components/generation/RouteModePage";

type RouteImagePageProps = {
  params: Promise<{ id: string }>;
};

export default async function RouteImagePage({ params }: RouteImagePageProps) {
  const { id } = await params;
  return <RouteModePage projectId={id} mode="image" />;
}
