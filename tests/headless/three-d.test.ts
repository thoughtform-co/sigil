import { describe, expect, it, vi } from "vitest";
import sharp from "sharp";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { decide, newThreeDState, STAGE_LIMIT_MS, type ThreeDState } from "@/lib/headless/three-d";
import { finishGlb, readGlb, writeGlb } from "@/lib/headless/glb";
import { decideAllowance, dailyLimit } from "@/lib/headless/allowance";
import { MESH_SETTINGS } from "@/lib/models/meshy";
import type { MeshyTask } from "@/lib/models/meshy";

const now = new Date("2026-10-17T12:00:00Z");
const task = (over: Partial<MeshyTask>): MeshyTask => ({
  id: "t",
  status: "SUCCEEDED",
  progress: 100,
  consumedCredits: 30,
  glbUrl: "https://assets.meshy.ai/x/model.glb",
  thumbnailUrl: "https://assets.meshy.ai/x/front.png",
  error: null,
  ...over,
});
const start = (rig: boolean): ThreeDState => newThreeDState({ meshTaskId: "mesh-1", rig, name: "Ada", now });

describe("a 3D job's stages", () => {
  it("waits while Meshy works, and gives up past the stage's limit", () => {
    const s = start(true);
    expect(decide(s, task({ status: "IN_PROGRESS", progress: 40 }), now).effect).toEqual({ kind: "wait", progress: 40 });
    const late = new Date(now.getTime() + STAGE_LIMIT_MS.mesh + 1);
    expect(decide(s, task({ status: "IN_PROGRESS" }), late).effect.kind).toBe("fail");
  });

  it("rigs a character after its mesh, and finishes an object straight away", () => {
    const rigged = decide(start(true), task({}), now);
    expect(rigged.effect).toEqual({ kind: "create_rig" });
    expect(rigged.state.credits).toBe(30);
    expect(rigged.state.meshGlb).toContain("model.glb");
    const object = decide(start(false), task({}), now);
    expect(object.effect).toEqual({ kind: "finish" });
    expect(object.state.sourceGlb).toBe(object.state.meshGlb);
  });

  it("delivers the mesh unrigged, with a note, when the rig cannot read the figure", () => {
    const afterMesh = decide(start(true), task({}), now).state;
    const rigging = { ...afterMesh, stage: "rig" as const, rigTaskId: "rig-1" };
    const out = decide(rigging, task({ status: "FAILED", glbUrl: null, error: "pose estimation failed" }), now);
    expect(out.effect).toEqual({ kind: "finish" });
    expect(out.state.sourceGlb).toBe(afterMesh.meshGlb);
    expect(out.state.notes.join(" ")).toMatch(/A-pose/);
  });

  it("takes the animated file when the clips succeed, the rigged one when they do not", () => {
    const base = { ...start(true), stage: "animate" as const, riggedGlb: "https://assets.meshy.ai/x/rigged.glb" };
    expect(decide(base, task({ glbUrl: "https://assets.meshy.ai/x/anim.glb", consumedCredits: 6 }), now).state.sourceGlb).toContain("anim.glb");
    expect(decide(base, task({ status: "FAILED", glbUrl: null }), now).state.sourceGlb).toContain("rigged.glb");
  });

  it("fails a mesh that Meshy could not make", () => {
    expect(decide(start(true), task({ status: "FAILED", glbUrl: null, error: "bad views" }), now).effect).toEqual({
      kind: "fail",
      message: "The model could not be made: bad views.",
    });
  });
});

describe("the mesh request", () => {
  it("keeps the measured settings: A-pose, no PBR, lighting removed, 30k triangles", () => {
    expect(MESH_SETTINGS).toMatchObject({ pose_mode: "a-pose", enable_pbr: false, remove_lighting: true, image_enhancement: false, target_polycount: 30000, target_formats: ["glb"] });
  });
});

describe("the 3D allowance", () => {
  it("defaults to three models a day and says so in its own words", () => {
    expect(dailyLimit("3d", {} as NodeJS.ProcessEnv)).toBe(3);
    const d = decideAllowance({ kind: "3d", requested: 1, rows: [1, 2, 3].map(() => ({ createdAt: now, count: 1 })), limit: 3, now });
    expect(d.ok).toBe(false);
    expect(!d.ok && d.message).toContain("3D models");
  });
});

/** A GLB with one triangle, a 2048 px PNG texture and a material that glows (as Meshy's rigged files do). */
async function glowingGlb(): Promise<Buffer> {
  const png = await sharp({ create: { width: 2048, height: 2048, channels: 3, background: { r: 200, g: 120, b: 60 } } }).png().toBuffer();
  const positions = Buffer.from(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]).buffer);
  const pad = (b: Buffer) => (b.length % 4 ? Buffer.concat([b, Buffer.alloc(4 - (b.length % 4))]) : b);
  const a = pad(positions);
  const bin = Buffer.concat([a, png]);
  const json = {
    asset: { version: "2.0" },
    buffers: [{ byteLength: bin.length }],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: positions.length },
      { buffer: 0, byteOffset: a.length, byteLength: png.length },
    ],
    accessors: [{ bufferView: 0, componentType: 5126, count: 3, type: "VEC3", max: [1, 1, 0], min: [0, 0, 0] }],
    images: [{ bufferView: 1, mimeType: "image/png" }],
    textures: [{ source: 0 }],
    materials: [{ pbrMetallicRoughness: { baseColorTexture: { index: 0 } }, emissiveTexture: { index: 0 }, emissiveFactor: [1, 1, 1] }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 }, material: 0 }] }],
    nodes: [{ mesh: 0 }],
    scenes: [{ nodes: [0] }],
    scene: 0,
  };
  return writeGlb(json as never, bin);
}

describe("finishing a model", () => {
  it("re-encodes the texture smaller, switches the glow off, and keeps the geometry", async () => {
    const before = await glowingGlb();
    const { glb, report } = await finishGlb(before);
    expect(report.images).toBe(1);
    expect(report.unglowed).toBe(1);
    const { json, bin } = readGlb(glb);
    expect(json.images?.[0]?.mimeType).toBe("image/jpeg");
    expect(json.materials?.[0]?.emissiveFactor).toEqual([0, 0, 0]);
    expect(json.materials?.[0]?.emissiveTexture).toBeUndefined();
    // the triangle's positions survive the repack, aligned at the start
    const pos = new Float32Array(bin.buffer.slice(bin.byteOffset, bin.byteOffset + 36));
    expect(Array.from(pos)).toEqual([0, 0, 0, 1, 0, 0, 0, 1, 0]);
    const tex = json.bufferViews![1]!;
    const meta = await sharp(bin.subarray(tex.byteOffset!, tex.byteOffset! + tex.byteLength)).metadata();
    expect(meta.format).toBe("jpeg");
    expect(meta.width).toBe(1536);
  });
});
