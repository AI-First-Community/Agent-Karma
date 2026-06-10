import { describe, it, expect } from "vitest";
import { getExtension, isTestFile, baseName } from "./fileUtils";

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
});
