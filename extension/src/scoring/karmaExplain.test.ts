import { describe, it, expect } from "vitest";
import { earnedRuleIds, explainKarmaMove } from "./karmaExplain";

const sess = (score: number, reasons: string[]) => ({ karmaScore: score, karmaReasons: reasons });

describe("earnedRuleIds", () => {
  it("recovers rule ids from reason strings (label-prefix match)", () => {
    const ids = earnedRuleIds(sess(35, ["Tests run (+25)", "Change measured (+5)", "Prompt hygiene hint (+5)"]));
    expect(ids.has("tests-run")).toBe(true);
    expect(ids.has("change-measured")).toBe(true);
    expect(ids.has("prompt-hygiene")).toBe(true);
    expect(ids.has("lint-clean")).toBe(false);
  });

  it("does not confuse 'Tests run' with 'Tests passed — observed'", () => {
    const ids = earnedRuleIds(sess(25, ["Tests run (+25)"]));
    expect(ids.has("tests-run")).toBe(true);
    expect(ids.has("tests-passed")).toBe(false);
  });
});

describe("explainKarmaMove", () => {
  it("explains a rise by the rules newly earned", () => {
    const prev = sess(30, ["Tests run (+25)", "Change measured (+5)"]);
    const curr = sess(65, ["Tests run (+25)", "Build / type-check ran clean (+20)", "Lint ran clean (+15)", "Change measured (+5)"]);
    const m = explainKarmaMove(prev, curr);
    expect(m.delta).toBe(35);
    expect(m.gained.map((r) => r.id)).toEqual(["build-clean", "lint-clean"]);
    expect(m.lost).toHaveLength(0);
    expect(m.summary).toContain("Karma rose 35");
  });

  it("explains a fall by the rules dropped", () => {
    const prev = sess(60, ["Tests run (+25)", "Build / type-check ran clean (+20)", "Lint ran clean (+15)"]);
    const curr = sess(25, ["Tests run (+25)"]);
    const m = explainKarmaMove(prev, curr);
    expect(m.delta).toBe(-35);
    expect(m.lost.map((r) => r.id)).toEqual(["build-clean", "lint-clean"]);
    expect(m.summary).toContain("Karma fell 35");
  });

  it("reports a steady score with no pattern change", () => {
    const s = sess(25, ["Tests run (+25)"]);
    const m = explainKarmaMove(s, s);
    expect(m.delta).toBe(0);
    expect(m.summary).toContain("No change");
  });

  it("notes a steady score whose composition shifted", () => {
    const prev = sess(25, ["Tests run (+25)"]);
    const curr = sess(25, ["Lint ran clean (+15)", "Change measured (+5)", "Prompt hygiene hint (+5)"]);
    const m = explainKarmaMove(prev, curr);
    expect(m.delta).toBe(0);
    expect(m.summary).toContain("held steady");
  });
});
