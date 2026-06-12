import { describe, it, expect } from "vitest";
import { generateWeeklyReflection } from "./weeklyReflection";
import { AgentKarmaSession, PhalCard, DharmaCard } from "../core/types";

const NOW = "2026-06-11T12:00:00.000Z";

function phal(over: Partial<PhalCard>): PhalCard {
  return {
    outcome: "Needs Review",
    filesChanged: 1,
    testFilesChanged: 0,
    validationDetected: false,
    commandsDetected: [],
    recommendations: [],
    ...over,
  };
}
function dharma(over: Partial<DharmaCard>): DharmaCard {
  return {
    task: "T", aiTool: "Claude Code", intentType: "Bug Fix",
    intentClarity: "Good", contextProvided: "Partial",
    expectedValidation: "Recommended", riskLevel: "Medium",
    ...over,
  };
}
function s(over: Partial<AgentKarmaSession>): AgentKarmaSession {
  return {
    id: Math.random().toString(36).slice(2),
    title: "S", aiTool: "Claude Code", taskType: "Bug Fix", intent: "",
    startedAt: "2026-06-10T10:00:00.000Z", // within the last 7 days of NOW
    status: "completed",
    ...over,
  };
}

describe("generateWeeklyReflection", () => {
  it("handles an empty week", () => {
    const r = generateWeeklyReflection([], NOW);
    expect(r.sessionCount).toBe(0);
    expect(r.tone).toBe("neutral");
    expect(r.summary).toMatch(/No sessions/);
  });

  it("ignores sessions outside the window", () => {
    const old = s({ startedAt: "2026-01-01T00:00:00.000Z", karmaScore: 80, phalCard: phal({ validationDetected: true }) });
    const r = generateWeeklyReflection([old], NOW);
    expect(r.sessionCount).toBe(0);
  });

  it("prioritizes a high-risk-without-validation nudge", () => {
    const sessions = [
      s({ karmaScore: 40, dharmaCard: dharma({ riskLevel: "High", intentType: "Security Fix" }), phalCard: phal({ validationDetected: false }) }),
      s({ karmaScore: 70, phalCard: phal({ validationDetected: true }) }),
    ];
    const r = generateWeeklyReflection(sessions, NOW);
    expect(r.nudge).toMatch(/high-risk/i);
    expect(r.tone).toBe("suggest");
  });

  it("suggests validating when most sessions skipped it", () => {
    const sessions = [
      s({ karmaScore: 20, phalCard: phal({ validationDetected: false, outcome: "High Risk" }) }),
      s({ karmaScore: 25, phalCard: phal({ validationDetected: false, outcome: "High Risk" }) }),
      s({ karmaScore: 60, phalCard: phal({ validationDetected: true }) }),
    ];
    const r = generateWeeklyReflection(sessions, NOW);
    expect(r.nudge).toMatch(/no tests \/ build \/ lint|validating/i);
    expect(r.validatedCount).toBe(1);
  });

  it("encourages when every session was validated", () => {
    const sessions = [
      s({ karmaScore: 80, phalCard: phal({ validationDetected: true }) }),
      s({ karmaScore: 75, phalCard: phal({ validationDetected: true }) }),
    ];
    const r = generateWeeklyReflection(sessions, NOW);
    expect(r.tone).toBe("encourage");
    expect(r.avgKarma).toBe(78); // round((80+75)/2)
  });
});
