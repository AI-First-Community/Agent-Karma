import { describe, it, expect } from "vitest";
import { toJson, buildSessionExport } from "./jsonExporter";
import { toMarkdown } from "./markdownExporter";
import { AgentKarmaSession, AgentKarmaEvent } from "../core/types";

const session: AgentKarmaSession = {
  id: "s1",
  title: "Fix login bug",
  aiTool: "Claude Code",
  taskType: "Bug Fix",
  intent: "fix login and add a test",
  startedAt: "2026-06-10T10:00:00.000Z",
  endedAt: "2026-06-10T10:25:00.000Z",
  status: "completed",
  karmaScore: 62,
  karmaScoreLabel: "Good",
  karmaReasons: ["Tests run (+25)", "Change measured (+5)"],
  dharmaCard: {
    task: "Fix login bug", aiTool: "Claude Code", intentType: "Bug Fix",
    intentClarity: "Good", contextProvided: "Partial",
    expectedValidation: "Explicit", riskLevel: "Medium",
  },
  phalCard: {
    outcome: "Needs Review", filesChanged: 2, testFilesChanged: 1,
    validationDetected: true, commandsDetected: [{ type: "Test", result: "passed" }],
    recommendations: ["Run lint before committing."],
  },
};

const events: AgentKarmaEvent[] = [
  { id: "e1", sessionId: "s1", type: "session.started", timestamp: "2026-06-10T10:00:00.000Z", data: {} },
  { id: "e2", sessionId: "s1", type: "validation.command", timestamp: "2026-06-10T10:20:00.000Z", data: { commandType: "Test", result: "passed", source: "observed" } },
  { id: "e3", sessionId: "sOTHER", type: "session.started", timestamp: "t", data: {} },
];

describe("jsonExporter", () => {
  it("exports the session and only its events", () => {
    const out = buildSessionExport(session, events, "2026-06-11T00:00:00.000Z");
    expect(out.session.id).toBe("s1");
    expect(out.events).toHaveLength(2); // the sOTHER event is excluded
    expect(out.schemaVersion).toBeGreaterThan(0);
  });

  it("produces valid JSON with no raw command strings", () => {
    const json = toJson(session, events, "2026-06-11T00:00:00.000Z");
    expect(() => JSON.parse(json)).not.toThrow();
    expect(json).not.toContain("npm test");
  });
});

describe("markdownExporter", () => {
  it("renders the expected sections", () => {
    const md = toMarkdown(session, events);
    expect(md).toContain("# Agent Karma Session Summary");
    expect(md).toContain("## Dharma Card");
    expect(md).toContain("## Karma Score");
    expect(md).toContain("Score: 62 (Good)");
    expect(md).toContain("## Karma Trace");
    expect(md).toContain("## Phal Card");
    expect(md).toContain("Outcome: Needs Review");
    expect(md).toContain("No source code captured");
  });
});
