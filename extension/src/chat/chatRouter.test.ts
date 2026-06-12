import { describe, it, expect } from "vitest";
import { parseChatCommand, formatSummary, formatVerify, helpText } from "./chatRouter";

describe("parseChatCommand", () => {
  it("routes /summary to a summary intent", () => {
    expect(parseChatCommand("summary", "")).toEqual({ kind: "summary" });
  });

  it("parses a validation type and result from /verify", () => {
    expect(parseChatCommand("verify", "ran the tests, all passing")).toEqual({
      kind: "verify",
      commandType: "Test",
      result: "passed",
    });
    expect(parseChatCommand("verify", "lint failed")).toEqual({
      kind: "verify",
      commandType: "Lint",
      result: "failed",
    });
    expect(parseChatCommand("verify", "typecheck is clean")).toEqual({
      kind: "verify",
      commandType: "Type Check",
      result: "passed",
    });
  });

  it("asks for clarification when /verify names no check", () => {
    expect(parseChatCommand("verify", "")).toEqual({ kind: "help" });
  });

  it("infers verify from free text with no slash command", () => {
    expect(parseChatCommand("", "I ran the unit tests")).toMatchObject({ kind: "verify", commandType: "Test" });
  });

  it("infers summary from free text", () => {
    expect(parseChatCommand("", "how's my karma score?")).toEqual({ kind: "summary" });
  });

  it("falls back to help for unrelated chatter", () => {
    expect(parseChatCommand("", "hello there")).toEqual({ kind: "help" });
  });
});

describe("formatSummary", () => {
  it("invites a first session when nothing is scored", () => {
    expect(formatSummary({})).toContain("No scored sessions yet");
  });

  it("renders the last score, reasons, nudge and readiness", () => {
    const md = formatSummary({
      lastTitle: "Fix login",
      lastScore: 62,
      lastLabel: "Good",
      lastReasons: ["Tests run (+25)"],
      reflectionNudge: "You validated 4 of 5 sessions — nice.",
      readinessSummary: "5 of 7 validation supports in place.",
      readinessTopGap: "A pre-commit net exists",
    });
    expect(md).toContain("Karma **62** (Good)");
    expect(md).toContain("Tests run (+25)");
    expect(md).toContain("This week:");
    expect(md).toContain("biggest gap: A pre-commit net exists");
  });
});

describe("formatVerify", () => {
  it("confirms a logged validation and notes it is self-reported", () => {
    const md = formatVerify("Test", "passed", true, "Tuesday");
    expect(md).toContain("Logged a **Test** validation (passed)");
    expect(md).toContain("Tuesday");
    expect(md).toContain("not observed");
  });

  it("explains failure when nothing could be logged", () => {
    expect(formatVerify("Test", "passed", false)).toContain("no active session");
  });
});

describe("helpText", () => {
  it("documents both commands and the browser-AI coverage", () => {
    const md = helpText();
    expect(md).toContain("/verify");
    expect(md).toContain("/summary");
    expect(md).toContain("browser");
  });
});
