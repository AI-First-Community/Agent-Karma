import { describe, it, expect } from "vitest";
import { buildEvents, type DojoScenarioData } from "./buildEvents";
import { calculateKarmaScore } from "../engine/karma";

// Parity tests: the Dojo must score with the REAL engine, and the pedagogy
// (failed-but-run still earns "tests run", never "tests passed") must hold.

const scenario: DojoScenarioData = {
  fileName: "auth.ts",
  hiddenIssues: [
    { kind: "Test", severity: "high", title: "Off-by-one on empty input", explanation: "…" },
  ],
};

function score(choices: Parameters<typeof buildEvents>[1]) {
  return calculateKarmaScore(buildEvents(scenario, choices));
}
const earned = (r: ReturnType<typeof score>, label: string) =>
  (r.breakdown ?? []).find((b) => b.label === label)?.earned ?? false;

describe("Dojo buildEvents → real engine parity", () => {
  it("running a Test that catches a hidden bug earns 'tests run' but NOT 'tests passed'", () => {
    const r = score({ intent: "Fix the auth bug and add a regression test", ranValidations: ["Test"], addedTest: true });
    expect(earned(r, "Tests run")).toBe(true);
    expect(earned(r, "Tests passed — observed")).toBe(false); // the vacuous-truth pedagogy
  });

  it("a passing Test (no matching hidden issue) earns BOTH", () => {
    const clean: DojoScenarioData = { fileName: "util.ts", hiddenIssues: [] };
    const r = calculateKarmaScore(
      buildEvents(clean, { intent: "Add a pure helper with tests", ranValidations: ["Test"], addedTest: true })
    );
    expect(earned(r, "Tests run")).toBe(true);
    expect(earned(r, "Tests passed — observed")).toBe(true);
  });

  it("skipping all validation scores lower than validating", () => {
    const lazy = score({ intent: "fix it", ranValidations: [], addedTest: false });
    const diligent = score({ intent: "Fix the off-by-one in auth and add a regression test", ranValidations: ["Test", "Lint"], addedTest: true });
    expect(diligent.score).toBeGreaterThan(lazy.score);
  });

  it("produces a real ScoreResult with a full breakdown", () => {
    const r = score({ intent: "Fix the bug", ranValidations: ["Test"], addedTest: false });
    expect(typeof r.score).toBe("number");
    expect(r.label).toBeTruthy();
    expect((r.breakdown ?? []).length).toBeGreaterThan(0);
  });
});
