// Guard: the engine-reuse boundary must stay pure. Fail the build if the browser
// bundle references any node/vscode module (which would mean a "pure" extension
// module grew a runtime dependency). Run after `astro build`.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = "dist";
const BAD =
  /require\(["'](vscode|fs|path|child_process|os|crypto)["']\)|from\s*["']vscode["']|["']node:(fs|path|child_process|os|crypto)["']/;

const hits = [];
function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p);
    else if (p.endsWith(".js") && BAD.test(readFileSync(p, "utf8"))) hits.push(p);
  }
}
walk(ROOT);

if (hits.length) {
  console.error("✗ no-node guard FAILED — node/vscode refs in the browser bundle:");
  for (const h of hits) console.error("  " + h);
  process.exit(1);
}
console.log("✓ no-node guard OK — browser bundle is free of node/vscode imports.");
