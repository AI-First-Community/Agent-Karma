import { describe, it, expect } from "vitest";
import { assessReadiness, ReadinessSignals } from "./validationReadiness";

const NONE: ReadinessSignals = {
  testScript: false,
  testDep: false,
  testConfigFile: false,
  buildScript: false,
  tsconfig: false,
  lintScript: false,
  lintConfig: false,
  lintDep: false,
  typecheckScript: false,
  ci: false,
  preCommit: false,
  agentMentionsValidation: false,
};

describe("assessReadiness", () => {
  it("reports nothing-to-validate-against when the workspace is bare", () => {
    const r = assessReadiness(NONE);
    expect(r.presentCount).toBe(0);
    expect(r.score).toBe(0);
    expect(r.summary).toContain("nothing to validate");
    expect(r.topGap?.key).toBe("test"); // highest-priority gap
  });

  it("treats any one test signal as 'tests can run'", () => {
    expect(assessReadiness({ ...NONE, testDep: true }).checks.find((c) => c.key === "test")?.present).toBe(true);
    expect(assessReadiness({ ...NONE, testScript: true }).checks.find((c) => c.key === "test")?.present).toBe(true);
    expect(assessReadiness({ ...NONE, testConfigFile: true }).checks.find((c) => c.key === "test")?.present).toBe(true);
  });

  it("derives both build and typecheck from a tsconfig", () => {
    const r = assessReadiness({ ...NONE, tsconfig: true });
    expect(r.checks.find((c) => c.key === "build")?.present).toBe(true);
    expect(r.checks.find((c) => c.key === "typecheck")?.present).toBe(true);
  });

  it("ranks the pre-commit net above build/ci as the next gap once test+lint exist", () => {
    const r = assessReadiness({ ...NONE, testScript: true, lintScript: true });
    expect(r.topGap?.key).toBe("preCommit");
  });

  it("reports full equipment when everything is present", () => {
    const ALL: ReadinessSignals = {
      testScript: true,
      testDep: true,
      testConfigFile: true,
      buildScript: true,
      tsconfig: true,
      lintScript: true,
      lintConfig: true,
      lintDep: true,
      typecheckScript: true,
      ci: true,
      preCommit: true,
      agentMentionsValidation: true,
    };
    const r = assessReadiness(ALL);
    expect(r.presentCount).toBe(r.total);
    expect(r.score).toBe(100);
    expect(r.topGap).toBeUndefined();
    expect(r.summary).toContain("Fully equipped");
  });

  it("gives an actionable detail for the missing pre-commit net", () => {
    const gap = assessReadiness(NONE).checks.find((c) => c.key === "preCommit");
    expect(gap?.present).toBe(false);
    expect(gap?.detail).toContain("pre-commit");
  });
});
