import { redirect } from "next/navigation";

type RoutePageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function RouteDetailPage({ params, searchParams }: RoutePageProps) {
  const { id } = await params;
  const query = await searchParams;
  const ref = query.ref;
  const search =
    ref != null && ref !== ""
      ? `?ref=${encodeURIComponent(Array.isArray(ref) ? ref[0] : ref)}`
      : "";
  redirect(`/routes/${id}/image${search}`);
}
