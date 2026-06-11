import { describe, it, expect } from "vitest";
import { calculateKarmaScore, nextEma, computeTrend, KarmaInput } from "./karmaScore";
import { AgentKarmaEvent } from "../core/types";

function ev(type: AgentKarmaEvent["type"], data: Record<string, unknown> = {}): AgentKarmaEvent {
  return { id: "e", sessionId: "s", type, timestamp: "t", data };
}

describe("calculateKarmaScore", () => {
  it("matches the scoring-model §6 worked example (= 62, Good)", () => {
    const input: KarmaInput = {
      events: [
        ev("file.saved", { fileName: "auth.service.ts", isTestFile: false }),
        ev("file.saved", { fileName: "auth.service.spec.ts", isTestFile: true }),
        ev("validation.command", { commandType: "Test", result: "passed", source: "observed" }),
      ],
      gitCaptured: true,
      promptHintScore: 70,
    };
    const r = calculateKarmaScore(input);
    // 25 (tests) + 10 (passed/observed) + 15 (coverage) + 5 (git) + 7 (prompt 70*.1) = 62
    expect(r.score).toBe(62);
    expect(r.label).toBe("Good");
  });

  it("vacuous-truth: no points for build/lint that never ran", () => {
    const r = calculateKarmaScore({ events: [], gitCaptured: false, promptHintScore: 0 });
    expect(r.score).toBe(0);
    expect(r.label).toBe("Needs Attention");
    expect(r.reasons).toEqual([]);
  });

  it("observed > logged: a logged-only test does NOT earn the passed bonus", () => {
    const events = [ev("validation.command", { commandType: "Test", result: "unknown", source: "logged" })];
    const r = calculateKarmaScore({ events, gitCaptured: false, promptHintScore: 0 });
    expect(r.score).toBe(25); // tests run, but no observed-passed bonus
    expect(r.reasons).toContain("Tests run (+25)");
    expect(r.reasons).not.toContain("Tests passed — observed (+10)");
  });

  it("does not award build-clean when the build failed", () => {
    const events = [ev("validation.command", { commandType: "Build", result: "failed", source: "observed" })];
    expect(calculateKarmaScore({ events, gitCaptured: false, promptHintScore: 0 }).score).toBe(0);
  });

  it("caps at 100", () => {
    const events = [
      ev("file.saved", { fileName: "a.ts", isTestFile: false }),
      ev("file.saved", { fileName: "a.test.ts", isTestFile: true }),
      ev("validation.command", { commandType: "Test", result: "passed", source: "observed" }),
      ev("validation.command", { commandType: "Build", result: "passed", source: "observed" }),
      ev("validation.command", { commandType: "Lint", result: "passed", source: "observed" }),
    ];
    expect(calculateKarmaScore({ events, gitCaptured: true, promptHintScore: 100 }).score).toBe(100);
  });
});

describe("EMA + trend", () => {
  it("seeds the EMA to the first score, then smooths", () => {
    expect(nextEma(undefined, 80)).toBe(80);
    expect(nextEma(80, 60)).toBeCloseTo(74); // 0.3*60 + 0.7*80
  });

  it("computes a self-comparative trend with a ±3 band", () => {
    expect(computeTrend(80, undefined)).toBe("flat"); // first session
    expect(computeTrend(80, 70)).toBe("up");
    expect(computeTrend(60, 70)).toBe("down");
    expect(computeTrend(72, 70)).toBe("flat");
  });
});
