import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { scanReadinessSignals, findNestedPackageRoots } from "./validationReadinessScan";

let root: string;

function write(rel: string, content: string): void {
  const full = path.join(root, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, "utf8");
}

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "ak-readiness-"));
});
afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true });
});

describe("scanReadinessSignals (monorepo / subfolder aware)", () => {
  it("reports bare when nothing exists anywhere", () => {
    const s = scanReadinessSignals(root);
    expect(s.testScript).toBe(false);
    expect(s.testDep).toBe(false);
    expect(s.lintScript).toBe(false);
    expect(s.tsconfig).toBe(false);
  });

  it("still detects a package.json at the root", () => {
    write("package.json", JSON.stringify({ scripts: { test: "vitest run" } }));
    expect(scanReadinessSignals(root).testScript).toBe(true);
  });

  it("detects tests when the package lives in a subfolder (e.g. extension/)", () => {
    // root itself has NO package.json — exactly this repo's layout
    write("extension/package.json", JSON.stringify({
      scripts: { test: "vitest run", lint: "eslint src" },
      devDependencies: { vitest: "^1.0.0", eslint: "^9.0.0" },
    }));
    write("extension/tsconfig.json", "{}");
    const s = scanReadinessSignals(root);
    expect(s.testScript).toBe(true);
    expect(s.testDep).toBe(true);
    expect(s.lintScript).toBe(true);
    expect(s.tsconfig).toBe(true);
  });

  it("detects signals under packages/* and apps/* monorepo dirs", () => {
    write("packages/core/package.json", JSON.stringify({ devDependencies: { jest: "^29" } }));
    write("apps/web/package.json", JSON.stringify({ scripts: { lint: "eslint ." } }));
    const s = scanReadinessSignals(root);
    expect(s.testDep).toBe(true); // from packages/core
    expect(s.lintScript).toBe(true); // from apps/web
  });

  it("does not descend into node_modules", () => {
    write("node_modules/some-dep/package.json", JSON.stringify({ scripts: { test: "vitest" } }));
    expect(scanReadinessSignals(root).testScript).toBe(false);
    expect(findNestedPackageRoots(root)).not.toContain(path.join(root, "node_modules", "some-dep"));
  });
});
