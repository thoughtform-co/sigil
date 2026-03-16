import { NextResponse } from "next/server";
import { getAuthedUser } from "@/lib/auth/server";
import { getAllModels, getModelsByType } from "@/lib/models/registry";
import { withCacheHeaders } from "@/lib/api/cache-headers";
import { sortModelsByPreference } from "@/lib/models/preferences";

export async function GET(request: Request) {
  const user = await getAuthedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");

  const models = type === "image" || type === "video"
    ? sortModelsByPreference(getModelsByType(type), type)
    : getAllModels();

  return withCacheHeaders(NextResponse.json({ models }), "stable");
}
