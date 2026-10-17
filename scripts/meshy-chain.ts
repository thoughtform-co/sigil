/**
 * Run generate_3d's Meshy chain on views on disk, outside the server: the same client
 * (lib/models/meshy.ts), the same stage decisions (lib/headless/three-d.ts decide) and the same
 * finish (lib/headless/glb.ts), with no database. For checking Meshy's real answers, and for a
 * teacher's sample model. The key comes from MESHY_API_KEY in the environment, never printed.
 *   MESHY_API_KEY=... npx tsx scripts/meshy-chain.ts <out.glb> <front> [right] [back] [left]
 */
import { readFileSync, writeFileSync } from "fs";
import { extname } from "path";
import { createAnimationTask, createMeshTask, createRigTask, findActionId, getTask, IDLE_ACTION_ID, type MeshyTaskKind } from "../lib/models/meshy";
import { decide, newThreeDState, type ThreeDState } from "../lib/headless/three-d";
import { finishGlb } from "../lib/headless/glb";

const [out, ...views] = process.argv.slice(2);
if (!out || views.length < 1) {
  console.error("usage: npx tsx scripts/meshy-chain.ts <out.glb> <front> [right] [back] [left]");
  process.exit(2);
}
const env = process.env;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const dataUri = (p: string) => `data:image/${extname(p).toLowerCase() === ".png" ? "png" : "jpeg"};base64,${readFileSync(p).toString("base64")}`;
const KIND: Record<"mesh" | "rig" | "animate", MeshyTaskKind> = { mesh: "multi-image-to-3d", rig: "rigging", animate: "animations" };
const log: Record<string, unknown>[] = [];

async function main() {
  const meshTaskId = await createMeshTask(env, views.map(dataUri));
  let state: ThreeDState = newThreeDState({ meshTaskId, rig: true, name: "sample" });
  console.log("mesh task", meshTaskId);
  for (let i = 0; i < 400; i++) {
    if (state.stage === "finish") break;
    const id = state.stage === "mesh" ? state.meshTaskId : state.stage === "rig" ? state.rigTaskId! : state.animTaskId!;
    const task = await getTask(env, KIND[state.stage as "mesh" | "rig" | "animate"], id);
    const { state: next, effect } = decide(state, task, new Date());
    state = next;
    if (effect.kind === "wait") {
      if (i % 3 === 0) console.log(`${state.stage} ${task.status} ${task.progress}%`);
      await sleep(10_000);
      continue;
    }
    log.push({ stage: state.stage, task: id, status: task.status, credits: task.consumedCredits, glb: Boolean(task.glbUrl) });
    if (effect.kind === "fail") throw new Error(effect.message);
    if (effect.kind === "create_rig") {
      state = { ...state, stage: "rig", rigTaskId: await createRigTask(env, state.meshTaskId), stageStartedAt: new Date().toISOString() };
      console.log("rig task", state.rigTaskId);
    } else if (effect.kind === "create_animation") {
      const wave = await findActionId(env, "wave");
      console.log("wave action", wave);
      state = { ...state, stage: "animate", animTaskId: await createAnimationTask(env, state.rigTaskId!, wave === null ? [IDLE_ACTION_ID] : [IDLE_ACTION_ID, wave]), stageStartedAt: new Date().toISOString() };
      console.log("animation task", state.animTaskId);
    } else {
      state = { ...state, stage: "finish" };
    }
  }
  const response = await fetch(state.sourceGlb!);
  const { glb, report } = await finishGlb(Buffer.from(await response.arrayBuffer()));
  writeFileSync(out, glb);
  writeFileSync(out.replace(/\.glb$/, ".json"), JSON.stringify({ credits: state.credits, notes: state.notes, report, tasks: log, thumbnail: state.thumbnail }, null, 2));
  console.log(JSON.stringify({ credits: state.credits, notes: state.notes, report }));
}
main().catch((err) => {
  console.error("failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
