import { build, context } from "esbuild";

const isWatch = process.argv.includes("--watch");

const config = {
  entryPoints: ["code.ts"],
  bundle: true,
  outfile: "code.js",
  format: "iife",
  target: "es2020",
  logLevel: "info",
};

if (isWatch) {
  const ctx = await context(config);
  await ctx.watch();
  console.log("Watching for changes...");
} else {
  await build(config);
}
