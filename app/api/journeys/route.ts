import { NextResponse } from "next/server";
import { getAuthedUser } from "@/lib/auth/server";
import { prefetchJourneysList } from "@/lib/prefetch/journeys";
import { withCacheHeaders } from "@/lib/api/cache-headers";

export async function GET() {
  const start = Date.now();
  try {
    const user = await getAuthedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const afterAuth = Date.now();

    const result = await prefetchJourneysList(user.id);
    const afterQuery = Date.now();

    if (!result) {
      return NextResponse.json({ error: "Journeys data failed" }, { status: 500 });
    }

    const response = NextResponse.json({ journeys: result.journeys });
    const total = Date.now() - start;
    response.headers.set(
      "Server-Timing",
      `auth;dur=${afterAuth - start},query;dur=${afterQuery - afterAuth},total;dur=${total}`,
    );
    return withCacheHeaders(response, "private-short");
  } catch {
    return NextResponse.json({ error: "Journeys API failed" }, { status: 500 });
  }
}
