import { NextResponse } from "next/server";
import { getAuthedUser } from "@/lib/auth/server";
import { prefetchDashboard } from "@/lib/prefetch/dashboard";
import { withCacheHeaders } from "@/lib/api/cache-headers";

export async function GET() {
  const start = Date.now();
  const user = await getAuthedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const afterAuth = Date.now();

  const result = await prefetchDashboard(user.id);
  const afterQuery = Date.now();

  if (!result) {
    return NextResponse.json({ error: "Dashboard data failed" }, { status: 500 });
  }

  const response = NextResponse.json(result.data);
  const total = Date.now() - start;
  response.headers.set(
    "Server-Timing",
    `auth;dur=${afterAuth - start},query;dur=${afterQuery - afterAuth},total;dur=${total}`,
  );
  return withCacheHeaders(response, "private-short");
}
