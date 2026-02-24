import { NextResponse } from "next/server";
import { getAuthedUser } from "@/lib/auth/server";
import { getAllModels, getModelsByType } from "@/lib/models/registry";

export async function GET(request: Request) {
  const user = await getAuthedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");

  if (type === "image" || type === "video") {
    return NextResponse.json({ models: getModelsByType(type) });
  }

  return NextResponse.json({ models: getAllModels() });
}
