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

  it("escapes HTML in user-provided fields (no injection)", () => {
    const evil: AgentKarmaSession = { ...base, title: "<img src=x onerror=alert(1)>" };
    const html = renderDashboardHtml({ nonce: "n", cspSource: "x", active: evil, recent: [] });
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;img src=x");
  });
});
