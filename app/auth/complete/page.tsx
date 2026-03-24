import { AuthCompleteClient } from "./AuthCompleteClient";

export default async function AuthCompletePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  return <AuthCompleteClient nextPath={params.next ?? null} />;
}
