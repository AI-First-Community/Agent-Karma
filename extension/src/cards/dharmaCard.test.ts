import { describe, it, expect } from "vitest";
import { generateDharmaCard, DharmaInput } from "./dharmaCard";
import { scorePrompt } from "../scoring/promptScorer";

function card(input: Partial<DharmaInput>) {
  const full: DharmaInput = {
    title: "T",
    aiTool: "Claude Code",
    taskType: "Bug Fix",
    intent: "",
    ...input,
  };
  return generateDharmaCard(full, scorePrompt(full.intent));
}

describe("generateDharmaCard", () => {
  it("maps a validation-aware Bug Fix correctly", () => {
    const c = card({
      taskType: "Bug Fix",
      intent: "fix the auth module error and add a regression test",
    });
    expect(c.expectedValidation).toBe("Explicit"); // mentions "test"/"regression"
    expect(c.riskLevel).toBe("Medium"); // Bug Fix
    expect(c.contextProvided).toBe("Partial"); // "module"/"error" but ≤80 chars
    expect(c.intentType).toBe("Bug Fix");
  });

  it("rates Security Fix as High risk and Recommended when validation is unmentioned", () => {
    const c = card({ taskType: "Security Fix", intent: "patch the vulnerability" });
    expect(c.riskLevel).toBe("High");
    expect(c.expectedValidation).toBe("Recommended");
  });

  it("rates Documentation as Low risk with Not Mentioned validation and no context", () => {
    const c = card({ taskType: "Documentation", intent: "write a short readme" });
    expect(c.riskLevel).toBe("Low");
    expect(c.expectedValidation).toBe("Not Mentioned");
    expect(c.contextProvided).toBe("None");
  });

  it("rates context as Good when a context word appears in a long intent (>80 chars)", () => {
    const c = card({
      taskType: "Refactoring",
      intent:
        "Refactor the payments service module to extract a clean interface and reduce coupling across callers",
    });
    expect(c.contextProvided).toBe("Good");
    expect(c.riskLevel).toBe("Medium"); // Refactoring
  });

  it("carries the prompt hint label as intentClarity", () => {
    const c = card({ intent: "fix the login bug and add a regression test in the auth module file" });
    expect(["Needs Clarity", "Decent", "Good", "Excellent"]).toContain(c.intentClarity);
  });
});
