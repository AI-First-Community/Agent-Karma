import { describe, it, expect } from "vitest";
import { getExtension, isTestFile, baseName, isIgnoredCapturePath } from "./fileUtils";

describe("fileUtils", () => {
  it("getExtension returns the lowercased extension or empty", () => {
    expect(getExtension("auth.service.TS")).toBe("ts");
    expect(getExtension("Makefile")).toBe("");
    expect(getExtension("a.spec.tsx")).toBe("tsx");
  });

  it("isTestFile detects test/spec names", () => {
    expect(isTestFile("auth.test.ts")).toBe(true);
    expect(isTestFile("auth.spec.ts")).toBe(true);
    expect(isTestFile("auth_test.py")).toBe(true);
    expect(isTestFile("auth.service.ts")).toBe(false);
  });

  it("baseName returns the last path segment", () => {
    expect(baseName("/Users/x/project/src/a.ts")).toBe("a.ts");
    expect(baseName("a.ts")).toBe("a.ts");
  });

  it("isIgnoredCapturePath skips deps/build/cache dirs and generated files", () => {
    // real source — captured
    expect(isIgnoredCapturePath("/repo/src/auth.ts")).toBe(false);
    expect(isIgnoredCapturePath("/repo/extension/media/icon.svg")).toBe(false);
    // dependency / build / cache directories
    expect(isIgnoredCapturePath("/repo/node_modules/x/index.js")).toBe(true);
    expect(isIgnoredCapturePath("/repo/dist/extension.js")).toBe(true);
    expect(isIgnoredCapturePath("/repo/.git/COMMIT_EDITMSG")).toBe(true);
    expect(isIgnoredCapturePath("/repo/coverage/lcov.info")).toBe(true);
    expect(isIgnoredCapturePath("/repo/__pycache__/m.cpython-312.pyc")).toBe(true);
    // generated / lock / noise files
    expect(isIgnoredCapturePath("/repo/yarn.lock")).toBe(true);
    expect(isIgnoredCapturePath("/repo/src/bundle.js.map")).toBe(true);
    expect(isIgnoredCapturePath("/repo/.DS_Store")).toBe(true);
    expect(isIgnoredCapturePath("/repo/debug.log")).toBe(true);
  });
});
