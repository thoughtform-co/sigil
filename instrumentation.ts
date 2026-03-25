/**
 * Runs once per server runtime. Fails fast in production if required env is missing.
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NODE_ENV !== "production") return;

  const { assertServerEnv } = await import("@/lib/env");
  assertServerEnv();
}
