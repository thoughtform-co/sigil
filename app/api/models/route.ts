import { NextResponse } from "next/server";
import { getAllModels, getModelsByType } from "@/lib/models/registry";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");

  if (type === "image" || type === "video") {
    return NextResponse.json({ models: getModelsByType(type) });
  }

  return NextResponse.json({ models: getAllModels() });
}
