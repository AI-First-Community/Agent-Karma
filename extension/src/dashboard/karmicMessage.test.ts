import { describe, it, expect } from "vitest";
import { karmicMessage } from "./karmicMessage";
import { AgentKarmaSession } from "../core/types";

const cons = (validatedCount: number, total: number) => ({
  validatedCount,
  total,
  currentRun: validatedCount,
  bestRun: validatedCount,
});

describe("karmicMessage", () => {
  it("invites a beginning when there is no Karma yet", () => {
    const m = karmicMessage({ rollingKarma: undefined, consistency: undefined });
    expect(m.mood).toBe("forming");
    expect(m.headline.toLowerCase()).toContain("karma you can trust");
  });

  it("is luminous when Karma is high and validation is consistent", () => {
    const m = karmicMessage({ rollingKarma: 85, consistency: cons(9, 10) });
    expect(m.mood).toBe("luminous");
  });

  it("is steady in the good band, forming in the middle, dim when low", () => {
    expect(karmicMessage({ rollingKarma: 70, consistency: cons(3, 6) }).mood).toBe("steady");
    expect(karmicMessage({ rollingKarma: 50, consistency: cons(2, 6) }).mood).toBe("forming");
    expect(karmicMessage({ rollingKarma: 20, consistency: cons(0, 6) }).mood).toBe("dim");
  });

  it("never shames — a dim state stays encouraging", () => {
    const m = karmicMessage({ rollingKarma: 15, consistency: cons(0, 8) });
    expect(m.headline.toLowerCase()).toContain("no judgment");
  });

  it("adds a Dharma→Phal sub-line from the last session when validated", () => {
    const last = {
      intent: "refactor auth",
      dharmaCard: { expectedValidation: "Recommended" },
      phalCard: { validationDetected: true },
    } as unknown as AgentKarmaSession;
    const m = karmicMessage({ rollingKarma: 70, consistency: cons(4, 6) }, last);
    expect(m.sub).toContain("refactor auth");
    expect(m.sub).toContain("Phal answered");
  });

  it("rotates the message as progress (session count) grows, within the same level", () => {
    const a = karmicMessage({ rollingKarma: 70, consistency: cons(4, 6), sessionCount: 7 });
    const b = karmicMessage({ rollingKarma: 70, consistency: cons(4, 6), sessionCount: 8 });
    expect(a.headline).not.toBe(b.headline); // different line as you progress
    expect(a.mood).toBe("steady");
    expect(b.mood).toBe("steady");
  });

  it("speaks to momentum — rising when the trend is up, slipping when down", () => {
    const up = karmicMessage({ rollingKarma: 55, consistency: cons(3, 6), lastTrend: "up", sessionCount: 6 });
    const down = karmicMessage({ rollingKarma: 55, consistency: cons(3, 6), lastTrend: "down", sessionCount: 6 });
    expect(up.headline.toLowerCase()).toMatch(/rising|upward|momentum/);
    expect(down.headline.toLowerCase()).toMatch(/slipping|dipping|drifting/);
  });

  it("uses the nascent voice for the first few sessions", () => {
    const m = karmicMessage({ rollingKarma: 50, consistency: cons(1, 2), sessionCount: 2 });
    expect(m.headline.toLowerCase()).toMatch(/begin|journey|new/);
  });

  it("notes when the Dharma asked for validation but the Phal went unverified", () => {
    const last = {
      intent: "",
      dharmaCard: { expectedValidation: "Explicit" },
      phalCard: { validationDetected: false },
    } as unknown as AgentKarmaSession;
    const m = karmicMessage({ rollingKarma: 30, consistency: cons(1, 6) }, last);
    expect(m.sub).toContain("went unverified");
  });
});
