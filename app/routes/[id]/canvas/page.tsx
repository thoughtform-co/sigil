import { RouteModePage } from "@/components/generation/RouteModePage";

type RouteCanvasPageProps = {
  params: Promise<{ id: string }>;
};

export default async function RouteCanvasPage({ params }: RouteCanvasPageProps) {
  const { id } = await params;
  return <RouteModePage projectId={id} mode="canvas" />;
}
