import { describe, it, expect } from "vitest";
import { computeStats } from "./dashboardStats";
import { AgentKarmaSession } from "../core/types";

function session(over: Partial<AgentKarmaSession>): AgentKarmaSession {
  return {
    id: Math.random().toString(36).slice(2),
    title: "S",
    aiTool: "Claude Code",
    taskType: "Bug Fix",
    intent: "",
    startedAt: "t",
    status: "completed",
    ...over,
  };
}

describe("computeStats", () => {
  it("returns an empty-ish shape with no sessions", () => {
    const s = computeStats([], undefined);
    expect(s.sessionCount).toBe(0);
    expect(s.validationRate).toBeUndefined();
    expect(s.scoreSeries).toEqual([]);
  });

  it("computes validation rate, tests-run, outcomes and score series over recent sessions", () => {
    const sessions: AgentKarmaSession[] = [
      session({
        karmaScore: 62, karmaTrend: "up",
        phalCard: { outcome: "Needs Review", filesChanged: 2, testFilesChanged: 1, validationDetected: true, commandsDetected: [{ type: "Test", result: "passed" }], recommendations: [] },
      }),
      session({
        karmaScore: 30,
        phalCard: { outcome: "High Risk", filesChanged: 1, testFilesChanged: 0, validationDetected: false, commandsDetected: [], recommendations: [] },
      }),
      session({ status: "active" }), // ignored (not completed)
    ];
    const s = computeStats(sessions, 58);
    expect(s.sessionCount).toBe(2);
    expect(s.recentCount).toBe(2);
    expect(s.validationRate).toBe(50); // 1 of 2
    expect(s.testsRunCount).toBe(1);
    expect(s.rollingKarma).toBe(58);
    expect(s.lastTrend).toBe(undefined); // last recent session has no trend set
    expect(s.scoreSeries).toEqual([62, 30]);
    expect(s.outcomes).toEqual({ ready: 0, needs: 1, highRisk: 1, informational: 0 });
  });
});
