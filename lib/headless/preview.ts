/** A JPEG small enough to hand back inside a tool result, so Claude can look at what was drawn. */

import sharp from "sharp";

const LONG_EDGE = 1280;

export async function makeImagePreview(url: string): Promise<{ data: string; mimeType: string } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const input = Buffer.from(await res.arrayBuffer());
    const output = await sharp(input)
      .rotate()
      .resize({ width: LONG_EDGE, height: LONG_EDGE, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 78 })
      .toBuffer();
    return { data: output.toString("base64"), mimeType: "image/jpeg" };
  } catch (err) {
    console.warn("[headless] preview failed", err instanceof Error ? err.message : err);
    return null;
  }
}
