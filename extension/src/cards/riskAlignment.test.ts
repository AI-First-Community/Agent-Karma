import { describe, it, expect } from "vitest";
import { riskAlignment } from "./riskAlignment";
import { AgentKarmaSession, DharmaCard, PhalCard } from "../core/types";

function s(risk: DharmaCard["riskLevel"], phal: Partial<PhalCard>): AgentKarmaSession {
  return {
    id: "x", title: "T", aiTool: "Claude Code", taskType: "Bug Fix", intent: "",
    startedAt: "t", status: "completed",
    dharmaCard: { task: "T", aiTool: "Claude Code", intentType: "Bug Fix", intentClarity: "Good", contextProvided: "Partial", expectedValidation: "Recommended", riskLevel: risk },
    phalCard: { outcome: "Needs Review", filesChanged: 1, testFilesChanged: 0, validationDetected: false, commandsDetected: [], recommendations: [], ...phal },
  };
}

describe("riskAlignment", () => {
  it("warns hard on a high-risk change with no validation", () => {
    const r = riskAlignment(s("High", { validationDetected: false }));
    expect(r.warn).toBe(true);
    expect(r.label).toMatch(/high-risk/i);
  });

  it("nudges a medium-risk unvalidated change", () => {
    expect(riskAlignment(s("Medium", { validationDetected: false })).warn).toBe(true);
  });

  it("does not nag a low-risk unvalidated change", () => {
    const r = riskAlignment(s("Low", { validationDetected: false }));
    expect(r.warn).toBe(false);
    expect(r.label).toBe("");
  });

  it("reassures when a high-risk change was validated", () => {
    const r = riskAlignment(s("High", { validationDetected: true }));
    expect(r.warn).toBe(false);
    expect(r.label).toMatch(/validated/i);
  });

  it("says nothing when no files changed", () => {
    expect(riskAlignment(s("High", { filesChanged: 0 })).label).toBe("");
  });
});
