/**
 * Finishing a Meshy model for the places it goes (a browser, a game room, a student's hand-in):
 *
 *   slim     re-encode every embedded texture to a JPEG of at most 1536 px. A Meshy character is
 *            mostly texture, and rigging re-textures it and triples the file (4.3 MB mesh, 9.0 MB
 *            rigged on the voidwalker rig); re-encoding after animating brought that to 2.2 MB
 *            with the clips intact. Geometry and animation are never touched.
 *   unglow   Meshy's rigged GLB wires the base colour into emission at full strength, so the
 *            whole body glows in a lit scene (the gradient descent, MEMORY L44); emission is
 *            switched off on every material.
 *
 * A port of voidwalker-avatar's slim_glb.py: the binary chunk is repacked from scratch in
 * bufferView order, since a re-encoded image is rarely the last view and every offset after it moves.
 */

import sharp from "sharp";

const JSON_CHUNK = 0x4e4f534a;
const BIN_CHUNK = 0x004e4942;

interface Gltf {
  bufferViews?: Array<{ buffer?: number; byteOffset?: number; byteLength: number; byteStride?: number; target?: number }>;
  buffers?: Array<{ byteLength: number; uri?: string }>;
  images?: Array<{ bufferView?: number; mimeType?: string; uri?: string }>;
  materials?: Array<{ emissiveFactor?: number[]; emissiveTexture?: unknown; extensions?: Record<string, unknown> }>;
  animations?: unknown[];
  skins?: unknown[];
  [key: string]: unknown;
}

export function readGlb(data: Buffer): { json: Gltf; bin: Buffer } {
  if (data.length < 20 || data.toString("ascii", 0, 4) !== "glTF") throw new Error("not a GLB");
  let off = 12;
  let json: Gltf | null = null;
  let bin: Buffer = Buffer.alloc(0);
  while (off + 8 <= data.length) {
    const length = data.readUInt32LE(off);
    const type = data.readUInt32LE(off + 4);
    off += 8;
    const chunk = data.subarray(off, off + length);
    off += length;
    if (type === JSON_CHUNK) json = JSON.parse(chunk.toString("utf8")) as Gltf;
    else if (type === BIN_CHUNK) bin = Buffer.from(chunk);
  }
  if (!json) throw new Error("GLB without a JSON chunk");
  return { json, bin };
}

export function writeGlb(json: Gltf, bin: Buffer): Buffer {
  let jb = Buffer.from(JSON.stringify(json), "utf8");
  if (jb.length % 4) jb = Buffer.concat([jb, Buffer.alloc(4 - (jb.length % 4), 0x20)]); // JSON pads with spaces
  let bb = bin;
  if (bb.length % 4) bb = Buffer.concat([bb, Buffer.alloc(4 - (bb.length % 4), 0)]); // BIN with zeros
  const total = 12 + 8 + jb.length + 8 + bb.length;
  const header = Buffer.alloc(12);
  header.write("glTF", 0, "ascii");
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(total, 8);
  const jh = Buffer.alloc(8);
  jh.writeUInt32LE(jb.length, 0);
  jh.writeUInt32LE(JSON_CHUNK, 4);
  const bh = Buffer.alloc(8);
  bh.writeUInt32LE(bb.length, 0);
  bh.writeUInt32LE(BIN_CHUNK, 4);
  return Buffer.concat([header, jh, jb, bh, bb]);
}

/** Switch emission off on every material (Meshy's rigged GLB lights the whole body with its own base colour). */
export function unglow(json: Gltf): number {
  let changed = 0;
  for (const m of json.materials ?? []) {
    if (m.emissiveTexture !== undefined || (m.emissiveFactor && m.emissiveFactor.some((v) => v > 0))) changed++;
    delete m.emissiveTexture;
    m.emissiveFactor = [0, 0, 0];
    if (m.extensions) delete m.extensions.KHR_materials_emissive_strength;
  }
  return changed;
}

export interface FinishReport {
  bytesBefore: number;
  bytesAfter: number;
  images: number;
  unglowed: number;
  animations: number;
  skinned: boolean;
}

/** Slim and unglow a GLB. Animations, skins and geometry pass through untouched. */
export async function finishGlb(data: Buffer, opts: { maxPx?: number; quality?: number } = {}): Promise<{ glb: Buffer; report: FinishReport }> {
  const maxPx = opts.maxPx ?? 1536;
  const quality = opts.quality ?? 82;
  const { json, bin } = readGlb(data);
  const views = json.bufferViews ?? [];
  const replaced = new Map<number, Buffer>();
  for (const img of json.images ?? []) {
    if (img.bufferView === undefined) continue;
    const v = views[img.bufferView];
    if (!v) continue;
    const raw = bin.subarray(v.byteOffset ?? 0, (v.byteOffset ?? 0) + v.byteLength);
    const jpeg = await sharp(raw)
      .resize({ width: maxPx, height: maxPx, fit: "inside", withoutEnlargement: true })
      .flatten({ background: "#000000" })
      .jpeg({ quality, progressive: true, mozjpeg: true })
      .toBuffer();
    replaced.set(img.bufferView, jpeg);
    img.mimeType = "image/jpeg";
  }
  const parts: Buffer[] = [];
  let length = 0;
  views.forEach((v, i) => {
    const blob = replaced.get(i) ?? bin.subarray(v.byteOffset ?? 0, (v.byteOffset ?? 0) + v.byteLength);
    const pad = (4 - (length % 4)) % 4; // keep accessor data aligned
    if (pad) {
      parts.push(Buffer.alloc(pad));
      length += pad;
    }
    v.byteOffset = length;
    v.byteLength = blob.length;
    v.buffer = 0;
    parts.push(blob);
    length += blob.length;
  });
  const packed = Buffer.concat(parts);
  json.buffers = [{ byteLength: packed.length }];
  const unglowed = unglow(json);
  const glb = writeGlb(json, packed);
  return {
    glb,
    report: {
      bytesBefore: data.length,
      bytesAfter: glb.length,
      images: replaced.size,
      unglowed,
      animations: json.animations?.length ?? 0,
      skinned: (json.skins?.length ?? 0) > 0,
    },
  };
}
