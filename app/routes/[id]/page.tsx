import { redirect } from "next/navigation";

type RoutePageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function RouteDetailPage({ params, searchParams }: RoutePageProps) {
  const { id } = await params;
  const query = await searchParams;
  const ref = query.ref;
  const session = query.session;
  const searchParamsList: string[] = [];
  if (ref != null && ref !== "")
    searchParamsList.push(`ref=${encodeURIComponent(Array.isArray(ref) ? ref[0] : ref)}`);
  if (session != null && session !== "")
    searchParamsList.push(`session=${encodeURIComponent(Array.isArray(session) ? session[0] : session)}`);
  const search = searchParamsList.length ? `?${searchParamsList.join("&")}` : "";
  redirect(`/routes/${id}/image${search}`);
}
