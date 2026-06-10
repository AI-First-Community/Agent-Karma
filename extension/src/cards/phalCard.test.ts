import { describe, it, expect } from "vitest";
import { generatePhalCard, PhalInput } from "./phalCard";
import { AgentKarmaEvent, DharmaCard } from "../core/types";

function ev(type: AgentKarmaEvent["type"], data: Record<string, unknown> = {}): AgentKarmaEvent {
  return { id: "e", sessionId: "s", type, timestamp: "t", data };
}

const bugFixDharma: DharmaCard = {
  task: "Fix", aiTool: "Claude Code", intentType: "Bug Fix",
  intentClarity: "Good", contextProvided: "Partial",
  expectedValidation: "Explicit", riskLevel: "Medium",
};

const docDharma: DharmaCard = {
  task: "Docs", aiTool: "Claude Code", intentType: "Documentation",
  intentClarity: "Decent", contextProvided: "None",
  expectedValidation: "Not Mentioned", riskLevel: "Low",
};

describe("generatePhalCard", () => {
  it("is Informational when nothing changed", () => {
    const p = generatePhalCard({ events: [], dharmaCard: bugFixDharma });
    expect(p.outcome).toBe("Informational");
    expect(p.filesChanged).toBe(0);
  });

  it("is Informational for a Low-risk doc task with no validation (not High Risk)", () => {
    const input: PhalInput = {
      dharmaCard: docDharma,
      events: [ev("file.saved", { fileName: "README.md", isTestFile: false })],
    };
    expect(generatePhalCard(input).outcome).toBe("Informational");
  });

  it("provisionally flags a Bug Fix with changes and no validation as High Risk", () => {
    const p = generatePhalCard({
      dharmaCard: bugFixDharma,
      events: [ev("file.saved", { fileName: "auth.ts", isTestFile: false })],
    });
    expect(p.outcome).toBe("High Risk");
    expect(p.validationDetected).toBe(false);
    expect(p.recommendations).toContain("Run tests or a build to validate these changes.");
    expect(p.recommendations).toContain("Consider adding or updating a regression test.");
  });

  it("counts files and validation, and never includes raw command strings", () => {
    const p = generatePhalCard({
      dharmaCard: bugFixDharma,
      events: [
        ev("file.saved", { fileName: "auth.ts", isTestFile: false }),
        ev("file.saved", { fileName: "auth.test.ts", isTestFile: true }),
        ev("validation.command", { commandType: "Test", result: "passed" }),
      ],
    });
    expect(p.filesChanged).toBe(2);
    expect(p.testFilesChanged).toBe(1);
    expect(p.validationDetected).toBe(true);
    expect(p.commandsDetected).toEqual([{ type: "Test", result: "passed" }]);
  });

  it("finalizes outcome with a score: Ready for Review when validated and score ≥ 75", () => {
    const events = [
      ev("file.saved", { fileName: "auth.ts", isTestFile: false }),
      ev("validation.command", { commandType: "Test", result: "passed" }),
      ev("git.diff.summary", { captured: true, filesChanged: 1, linesAdded: 5, linesDeleted: 1 }),
    ];
    expect(generatePhalCard({ dharmaCard: bugFixDharma, events, karmaScore: 80 }).outcome).toBe("Ready for Review");
    expect(generatePhalCard({ dharmaCard: bugFixDharma, events, karmaScore: 60 }).outcome).toBe("Needs Review");
  });
});
