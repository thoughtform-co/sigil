/**
 * Run the 3D finish step (lib/headless/glb.ts) on a GLB on disk: the same slimming and glow
 * switch a model made through generate_3d gets, for checking a Meshy file by hand.
 *   npx tsx scripts/finish-glb.ts in.glb out.glb
 */
import { readFileSync, writeFileSync } from "fs";
import { finishGlb } from "../lib/headless/glb";

const [src, dst] = process.argv.slice(2);
if (!src || !dst) {
  console.error("usage: npx tsx scripts/finish-glb.ts in.glb out.glb");
  process.exit(2);
}
finishGlb(readFileSync(src)).then(({ glb, report }) => {
  writeFileSync(dst, glb);
  console.log(JSON.stringify(report));
});
