import { describe, it, expect } from "vitest";
import { scorePrompt } from "./promptScorer";

describe("scorePrompt", () => {
  it("scores an empty prompt as 0 / Needs Clarity", () => {
    const r = scorePrompt("");
    expect(r.score).toBe(0);
    expect(r.label).toBe("Needs Clarity");
    expect(r.reasons).toEqual([]);
  });

  it("scores a clear, validation-aware prompt and labels it Good", () => {
    // 10 words, action "fix", validation "test"+"regression", length 50-1000.
    // NOTE: contains no §2 context word (file/error/bug/module/...), so no +15 there.
    const r = scorePrompt("Fix the login failure issue and add a regression test.");
    expect(r.score).toBe(70); // 20 + 20 + 20 + 10
    expect(r.label).toBe("Good");
    expect(r.reasons).toContain("More than 5 words (+20)");
    expect(r.reasons).toContain("States an action (+20)");
    expect(r.reasons).toContain("Mentions validation (+20)");
    expect(r.reasons).not.toContain("Provides context (+15)");
  });

  it("awards context and constraint points and caps at 100", () => {
    const r = scorePrompt(
      "Refactor the auth module and its API; you must preserve behavior and add a regression test, only touching the service file."
    );
    expect(r.score).toBe(100); // words+action+context+constraint+validation+length all hit, capped
    expect(r.label).toBe("Excellent");
  });

  it("gives a short vague prompt a low score", () => {
    const r = scorePrompt("do it");
    expect(r.score).toBe(0);
    expect(r.label).toBe("Needs Clarity");
  });

  it("labels the band boundaries correctly", () => {
    // exactly 40 → Decent (action 20 + validation 20)
    expect(scorePrompt("test build").score).toBe(40);
    expect(scorePrompt("test build").label).toBe("Decent");
  });
});
