import { redirect } from "next/navigation";

type ProjectPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function ProjectDetailPage({ params, searchParams }: ProjectPageProps) {
  const { id } = await params;
  const query = await searchParams;
  const ref = query.ref;
  const search =
    ref != null && ref !== ""
      ? `?ref=${encodeURIComponent(Array.isArray(ref) ? ref[0] : ref)}`
      : "";
  redirect(`/projects/${id}/image${search}`);
}
