import { describe, it, expect } from "vitest";
import { buildKarmaTrace } from "./karmaTrace";
import { AgentKarmaEvent } from "../core/types";

function ev(
  type: AgentKarmaEvent["type"],
  timestamp: string,
  data: Record<string, unknown> = {}
): AgentKarmaEvent {
  return { id: "e", sessionId: "s", type, timestamp, data };
}

describe("buildKarmaTrace", () => {
  it("renders events chronologically as HH:MM lines", () => {
    const trace = buildKarmaTrace([
      ev("session.ended", "2026-06-10T10:25:00.000Z"),
      ev("session.started", "2026-06-10T10:00:00.000Z"),
      ev("file.saved", "2026-06-10T10:05:00.000Z", { fileName: "auth.ts" }),
    ]);
    expect(trace[0]).toBe("10:00 Session started");
    expect(trace[1]).toBe("10:05 File saved: auth.ts");
    expect(trace[2]).toBe("10:25 Session ended");
  });

  it("formats validation and git events with detail", () => {
    const trace = buildKarmaTrace([
      ev("validation.command", "2026-06-10T10:20:00.000Z", { commandType: "Test", result: "passed" }),
      ev("git.diff.summary", "2026-06-10T10:24:00.000Z", { filesChanged: 3, linesAdded: 48, linesDeleted: 12 }),
    ]);
    expect(trace[0]).toBe("10:20 Validation: Test (passed)");
    expect(trace[1]).toBe("10:24 Git diff: 3 files, +48 / -12");
  });

  it("formats a git.commit event with its short sha, and falls back without one", () => {
    const trace = buildKarmaTrace([
      ev("git.commit", "2026-06-10T10:30:00.000Z", { sha: "abcdef1234" }),
      ev("git.commit", "2026-06-10T10:31:00.000Z"),
    ]);
    expect(trace[0]).toBe("10:30 Commit abcdef1234");
    expect(trace[1]).toBe("10:31 Commit");
  });
});
