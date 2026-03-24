import { AuthCompleteClient } from "./AuthCompleteClient";

export default async function AuthCompletePage({
  searchParams,
}: {
  searchParams: Promise<{
    next?: string;
    code?: string;
    token_hash?: string;
    type?: string;
  }>;
}) {
  const params = await searchParams;
  return (
    <AuthCompleteClient
      nextPath={params.next ?? null}
      code={params.code ?? null}
      tokenHash={params.token_hash ?? null}
      type={params.type ?? null}
    />
  );
}
