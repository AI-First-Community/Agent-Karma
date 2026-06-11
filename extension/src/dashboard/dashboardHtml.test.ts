import { describe, it, expect } from "vitest";
import { renderDashboardHtml } from "./dashboardHtml";
import { AgentKarmaSession } from "../core/types";

const base: AgentKarmaSession = {
  id: "s1",
  title: "Fix login",
  aiTool: "Claude Code",
  taskType: "Bug Fix",
  intent: "fix login",
  startedAt: "2026-06-10T10:00:00.000Z",
  status: "active",
};

describe("renderDashboardHtml", () => {
  it("includes a strict CSP and the provided nonce", () => {
    const html = renderDashboardHtml({ nonce: "abc123", cspSource: "vscode-resource:", active: undefined, recent: [] });
    expect(html).toContain("Content-Security-Policy");
    expect(html).toContain("default-src 'none'");
    expect(html).toContain("nonce-abc123");
    // no scripts allowed at all
    expect(html).not.toContain("<script");
  });

  it("shows the empty state when there is no active session", () => {
    const html = renderDashboardHtml({ nonce: "n", cspSource: "x", active: undefined, recent: [] });
    expect(html).toContain("No active session");
  });

  it("renders the active session and completed rows", () => {
    const completed: AgentKarmaSession = { ...base, id: "s0", status: "completed", endedAt: "2026-06-10T10:20:00.000Z" };
    const html = renderDashboardHtml({ nonce: "n", cspSource: "x", active: base, recent: [completed] });
    expect(html).toContain("Fix login");
    expect(html).toContain("Claude Code");
    expect(html).toContain("● Recording");
  });

  it("renders the Dharma card and the prompt hint as a soft hint", () => {
    const withCard: AgentKarmaSession = {
      ...base,
      promptHintLabel: "Good",
      dharmaCard: {
        task: "Fix login",
        aiTool: "Claude Code",
        intentType: "Bug Fix",
        intentClarity: "Good",
        contextProvided: "Partial",
        expectedValidation: "Explicit",
        riskLevel: "Medium",
      },
    };
    const html = renderDashboardHtml({ nonce: "n", cspSource: "x", active: withCard, recent: [] });
    expect(html).toContain("Dharma Card");
    expect(html).toContain("Expected validation");
    expect(html).toContain("Explicit");
    expect(html).toContain("prompt hygiene: Good");
  });

  it("summarizes captured files and validation for the active session", () => {
    const events = [
      { id: "1", sessionId: "s1", type: "file.saved" as const, timestamp: "t", data: { fileName: "a.ts", isTestFile: false } },
      { id: "2", sessionId: "s1", type: "file.saved" as const, timestamp: "t", data: { fileName: "a.spec.ts", isTestFile: true } },
      { id: "3", sessionId: "s1", type: "validation.command" as const, timestamp: "t", data: { commandType: "Test", result: "passed" } },
    ];
    const html = renderDashboardHtml({ nonce: "n", cspSource: "x", active: base, activeEvents: events, recent: [] });
    expect(html).toContain("Files changed");
    expect(html).toContain("2 files (1 test)");
    expect(html).toContain("Test (passed)");
  });

  it("shows the Karma Score checklist, number and trend for the last session", () => {
    const completed: AgentKarmaSession = {
      ...base,
      id: "s9",
      status: "completed",
      endedAt: "2026-06-10T10:25:00.000Z",
      karmaScore: 62,
      karmaScoreLabel: "Good",
      karmaReasons: ["Tests run (+25)", "Change measured (+5)"],
      karmaTrend: "up",
      phalCard: {
        outcome: "Needs Review",
        filesChanged: 2,
        testFilesChanged: 1,
        validationDetected: true,
        commandsDetected: [{ type: "Test", result: "passed" }],
        recommendations: ["Run lint before committing."],
      },
    };
    const html = renderDashboardHtml({
      nonce: "n",
      cspSource: "x",
      active: undefined,
      recent: [completed],
      lastCompleted: completed,
      lastCompletedEvents: [],
    });
    expect(html).toContain("Karma Score");
    expect(html).toContain("✔ Tests run (+25)");
    expect(html).toContain("Karma <b>62</b>");
    expect(html).toContain("Good");
    expect(html).toContain("↑ vs your average");
    expect(html).toContain("Needs Review");
  });

  it("renders the at-a-glance hero stats (Karma, validation rate, trend, outcomes)", () => {
    const html = renderDashboardHtml({
      nonce: "n",
      cspSource: "x",
      active: undefined,
      recent: [],
      stats: {
        rollingKarma: 71,
        lastTrend: "up",
        sessionCount: 12,
        recentCount: 10,
        validationRate: 70,
        testsRunCount: 6,
        scoreSeries: [40, 55, 62, 71],
        outcomes: { ready: 3, needs: 5, highRisk: 2, informational: 0 },
      },
    });
    expect(html).toContain("Karma <b>71</b>");
    expect(html).toContain("12 sessions");
    expect(html).toContain("70%");
    expect(html).toContain("6 / 10");
    expect(html).toContain("<polyline"); // sparkline
    expect(html).toContain("seg-ready"); // outcome distribution
  });

  it("shows a friendly empty hero when there are no sessions", () => {
    const html = renderDashboardHtml({ nonce: "n", cspSource: "x", active: undefined, recent: [] });
    expect(html).toContain("No sessions yet");
  });

  it("escapes HTML in user-provided fields (no injection)", () => {
    const evil: AgentKarmaSession = { ...base, title: "<img src=x onerror=alert(1)>" };
    const html = renderDashboardHtml({ nonce: "n", cspSource: "x", active: evil, recent: [] });
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;img src=x");
  });
});
