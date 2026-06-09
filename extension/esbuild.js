// Bundles the extension into a single auditable file (dist/extension.js).
// A single bundle makes the "no network" CI check (npm run check:no-network) reliable.
const esbuild = require("esbuild");

const watch = process.argv.includes("--watch");
const minify = process.argv.includes("--minify");

/** @type {import('esbuild').BuildOptions} */
const options = {
  entryPoints: ["src/extension.ts"],
  bundle: true,
  outfile: "dist/extension.js",
  external: ["vscode"], // provided by the VS Code runtime, never bundled
  format: "cjs",
  platform: "node",
  target: "node18",
  sourcemap: !minify,
  minify,
  logLevel: "info",
};

async function run() {
  if (watch) {
    const ctx = await esbuild.context(options);
    await ctx.watch();
    console.log("[esbuild] watching…");
  } else {
    await esbuild.build(options);
    console.log("[esbuild] build complete");
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
