import { describe, it, expect } from "vitest";
import { highRiskWatchlist, worstTaskCheck, scoreComposition, usageAttribution, computeRework } from "./insights";
import { AgentKarmaSession, AgentKarmaEvent } from "../core/types";

const sess = (over: Partial<AgentKarmaSession>): AgentKarmaSession =>
  ({
    id: "x",
    title: "S",
    aiTool: "Claude Code",
    taskType: "Bug Fix",
    intent: "",
    startedAt: "t",
    status: "completed",
    ...over,
  }) as AgentKarmaSession;

describe("highRiskWatchlist", () => {
  it("lists high-risk sessions that were not validated, newest first", () => {
    const sessions = [
      sess({ title: "A", dharmaCard: { riskLevel: "High" } as never, phalCard: { validationDetected: false } as never }),
      sess({ title: "B", dharmaCard: { riskLevel: "High" } as never, phalCard: { validationDetected: true } as never }),
      sess({ title: "C", dharmaCard: { riskLevel: "Low" } as never, phalCard: { validationDetected: false } as never }),
      sess({ title: "D", dharmaCard: { riskLevel: "High" } as never, phalCard: { validationDetected: false } as never }),
    ];
    const w = highRiskWatchlist(sessions);
    expect(w.map((x) => x.title)).toEqual(["D", "A"]);
  });

  it("is empty when nothing risky was left unvalidated", () => {
    expect(highRiskWatchlist([sess({ dharmaCard: { riskLevel: "Low" } as never })])).toEqual([]);
  });
});

describe("worstTaskCheck", () => {
  it("finds the lowest task×check rate with enough sessions, below the threshold", () => {
    const rows = [
      { label: "Refactoring", cells: [{ label: "Test", value: 25, n: 4 }, { label: "Lint", value: 80, n: 4 }] },
      { label: "Bug Fix", cells: [{ label: "Test", value: 90, n: 3 }, { label: "Lint", value: 70, n: 3 }] },
    ];
    expect(worstTaskCheck(rows)).toEqual({ task: "Refactoring", check: "Test", rate: 25, n: 4 });
  });

  it("ignores cells with too little data and returns null when nothing is a real gap", () => {
    const rows = [
      { label: "Bug Fix", cells: [{ label: "Test", value: 20, n: 1 }, { label: "Lint", value: 90, n: 5 }] },
    ];
    expect(worstTaskCheck(rows)).toBeNull();
  });
});

describe("scoreComposition", () => {
  it("splits earned Karma into real verification vs near-free points", () => {
    const sessions = [
      sess({ karmaReasons: ["Tests run (+25)", "Build / type-check ran clean (+20)", "Change measured (+5)"] }),
      sess({ karmaReasons: ["Change measured (+5)", "Prompt hygiene hint (+8)"] }),
    ];
    const c = scoreComposition(sessions);
    // real = 25 + 20 = 45; cheap = 5 + 5 + 8 = 18; total 63 → real ≈ 71%
    expect(c.total).toBe(63);
    expect(c.realPct).toBe(71);
    expect(c.segs.find((s) => s.id === "tests-run")?.points).toBe(25);
  });

  it("is empty when no Karma was earned", () => {
    expect(scoreComposition([sess({ karmaReasons: [] })]).total).toBe(0);
  });
});

describe("usageAttribution", () => {
  const sessions = [
    sess({ startedAt: "2026-06-12T10:00:00Z", endedAt: "2026-06-12T10:30:00Z", phalCard: { validationDetected: true } as never }),
    sess({ startedAt: "2026-06-12T11:00:00Z", endedAt: "2026-06-12T11:30:00Z", phalCard: { validationDetected: false } as never }),
  ];

  it("splits output tokens into validated, unvalidated, and untracked", () => {
    const timeline = [
      { ts: "2026-06-12T10:10:00Z", output: 100 }, // inside validated session
      { ts: "2026-06-12T11:10:00Z", output: 60 }, // inside unvalidated session
      { ts: "2026-06-12T12:10:00Z", output: 40 }, // outside any session
    ];
    const a = usageAttribution(timeline, sessions);
    expect(a.validated).toBe(100);
    expect(a.unvalidated).toBe(60);
    expect(a.untracked).toBe(40);
    expect(a.validatedPct).toBe(50);
  });

  it("is all-zero on an empty timeline", () => {
    expect(usageAttribution([], sessions).total).toBe(0);
  });
});

describe("computeRework", () => {
  const ev = (sessionId: string, fileName: string): AgentKarmaEvent =>
    ({ id: "e", sessionId, type: "file.saved", timestamp: "t", data: { fileName } }) as AgentKarmaEvent;

  it("counts files saved 3+ times within a session and names the worst", () => {
    const events = [
      ev("s1", "a.ts"), ev("s1", "a.ts"), ev("s1", "a.ts"), ev("s1", "a.ts"), // 4× churn
      ev("s1", "b.ts"), ev("s1", "b.ts"), ev("s1", "b.ts"), // 3× churn
      ev("s1", "c.ts"), // once — not churn
    ];
    const r = computeRework(events);
    expect(r.churnedFiles).toBe(2);
    expect(r.topFile).toEqual({ name: "a.ts", saves: 4 });
  });

  it("does not merge the same file across different sessions", () => {
    const events = [ev("s1", "a.ts"), ev("s1", "a.ts"), ev("s2", "a.ts")];
    expect(computeRework(events).churnedFiles).toBe(0);
  });
});
