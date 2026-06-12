import { describe, it, expect } from "vitest";
import { aggregateClaudeUsage, totalTokens } from "./claudeUsage";

const line = (o: unknown) => JSON.stringify(o);

describe("aggregateClaudeUsage", () => {
  it("sums token usage across assistant turns and counts sessions/models", () => {
    const lines = [
      line({ type: "user", sessionId: "s1", message: { content: "hi" } }),
      line({
        type: "assistant",
        sessionId: "s1",
        timestamp: "2026-06-12T10:00:00Z",
        message: { model: "claude-opus-4-8", usage: { input_tokens: 100, output_tokens: 50, cache_read_input_tokens: 20, cache_creation_input_tokens: 10 } },
      }),
      line({
        type: "assistant",
        sessionId: "s2",
        timestamp: "2026-06-12T11:00:00Z",
        message: { model: "claude-opus-4-8", usage: { input_tokens: 200, output_tokens: 80 } },
      }),
    ];
    const u = aggregateClaudeUsage(lines);
    expect(u.inputTokens).toBe(300);
    expect(u.outputTokens).toBe(130);
    expect(u.cacheReadTokens).toBe(20);
    expect(u.turns).toBe(2);
    expect(u.sessions).toBe(2);
    expect(u.models[0]).toMatchObject({ model: "claude-opus-4-8", turns: 2, outputTokens: 130 });
    expect(u.firstTs).toBe("2026-06-12T10:00:00Z");
    expect(u.lastTs).toBe("2026-06-12T11:00:00Z");
    expect(totalTokens(u)).toBe(300 + 130 + 20 + 10);
  });

  it("skips malformed lines and non-assistant rows without throwing", () => {
    const u = aggregateClaudeUsage(["", "{not json", line({ type: "summary" })]);
    expect(u.turns).toBe(0);
    expect(totalTokens(u)).toBe(0);
  });

  it("never reads message content — only usage metadata", () => {
    // A line whose content holds secrets; we only ever touch usage/model/type/timestamp.
    const u = aggregateClaudeUsage([
      line({ type: "assistant", sessionId: "s", message: { model: "m", content: "SECRET_API_KEY=abc", usage: { output_tokens: 5 } } }),
    ]);
    expect(u.outputTokens).toBe(5);
    expect(JSON.stringify(u)).not.toContain("SECRET");
  });
});
