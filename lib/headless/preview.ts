/**
 * A JPEG small enough to hand back inside a tool result, so Claude can look at what was drawn.
 *
 * sharp is loaded when a preview is made, not when the module is: it is a native library, and if
 * its binary is missing from a deployment the draw must still come back with its links.
 */

const LONG_EDGE = 1280;

export async function makeImagePreview(url: string): Promise<{ data: string; mimeType: string } | null> {
  try {
    const { default: sharp } = await import("sharp");
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
