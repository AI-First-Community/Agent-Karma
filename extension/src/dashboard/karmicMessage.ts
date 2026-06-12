import { AgentKarmaSession } from "../core/types";
import { DashboardStats } from "./dashboardStats";

// An inspiring, Dharma/Karma/Phal-framed reflection of the developer's current state.
// The metaphor IS the thesis: unvalidated Karma (action) bears uncertain Phal (fruit).
// Always encouraging, never shaming — a low state reads as "unresolved", not "bad".
//
// Each level has a POOL of lines, and we pick by progress (session count) so the
// message rotates as you grow, and by momentum (trend up → "ascending", down →
// "slipping") so it reflects where you're heading, not just where you are.

export type KarmicMood = "luminous" | "steady" | "forming" | "dim";

export interface KarmicMessage {
  mood: KarmicMood;
  /** The headline reflection (one evocative line). */
  headline: string;
  /** Optional Dharma→Phal sub-line tied to the most recent session. */
  sub?: string;
}

// Pools — ordered so index 0 carries the load-bearing phrase used by tests/first run.
const POOLS: Record<string, string[]> = {
  nascent: [
    "Every act of validation is Karma you can trust. Begin.",
    "Your path begins — set an intention, verify the AI's work, and let your Karma take shape.",
    "A new journey. The first validated session plants the seed of trustworthy work.",
  ],
  dim: [
    "Your Karma is dim — much went unverified. No judgment; one check, and it brightens.",
    "Shadows for now, but every path turns. A single test shifts your Karma toward the light.",
    "Unverified work weighs on the fruit. Lighten it — validate your next change.",
  ],
  forming: [
    "Your Karma is forming — each validation is a step from doubt toward mastery.",
    "You're finding your rhythm. Keep verifying, and the habit becomes second nature.",
    "Halfway to steady. The discipline is taking root.",
  ],
  steady: [
    "Your Karma is steady — more often than not, you check before you trust. Hold the line.",
    "Dependable work. Your validation habit is real now — protect it.",
    "You verify with care. Steady hands make trustworthy code.",
  ],
  luminous: [
    "Your Karma is luminous — you verify with intention, and your work bears fruit you can trust.",
    "Mastery shows. You don't just write with AI; you verify it, every time.",
    "Bright and clear. Your discipline is the standard others aspire to.",
  ],
  ascending: [
    "Your Karma is rising — the care you're putting into validation is paying off.",
    "Upward. Session by session, you're trusting the AI more wisely.",
    "Momentum is with you. Each verified change lifts the whole.",
  ],
  slipping: [
    "Your Karma is slipping — a gentle nudge to verify before you trust again.",
    "The line is dipping. One validated session sets it right.",
    "Drifting a little. Catch it now with a single check.",
  ],
};

const MOOD_OF: Record<string, KarmicMood> = {
  nascent: "forming",
  dim: "dim",
  forming: "forming",
  steady: "steady",
  luminous: "luminous",
  ascending: "steady",
  slipping: "forming",
};

function pick(pool: string[], seed: number): string {
  return pool[((seed % pool.length) + pool.length) % pool.length];
}

/** How the Dharma's expected validation reads in the reflection. */
function expectedPhrase(expected: string | undefined): string {
  switch (expected) {
    case "Explicit":
      return "called for thorough validation";
    case "Recommended":
      return "called for validation";
    default:
      return "named no validation";
  }
}

export function karmicMessage(
  stats: Partial<Pick<DashboardStats, "rollingKarma" | "consistency" | "lastTrend" | "sessionCount">>,
  last?: AgentKarmaSession
): KarmicMessage {
  const k = stats.rollingKarma;
  const seed = stats.sessionCount ?? stats.consistency?.validatedCount ?? 0;

  // The level — which pool to draw from. Momentum (trend) takes priority in the
  // middle bands so progress itself shapes the message.
  let level: string;
  if (k === undefined || (stats.sessionCount !== undefined && stats.sessionCount < 3)) {
    level = "nascent";
  } else {
    const c = stats.consistency;
    const consistent = !!c && c.total >= 3 && c.validatedCount / c.total >= 0.6;
    const band = k >= 80 && consistent ? "luminous" : k >= 60 ? "steady" : k >= 40 ? "forming" : "dim";
    if (stats.lastTrend === "up" && band !== "luminous") {
      level = "ascending";
    } else if (stats.lastTrend === "down" && band !== "dim") {
      level = "slipping";
    } else {
      level = band;
    }
  }

  const headline = pick(POOLS[level], seed);
  const mood = MOOD_OF[level];

  let sub: string | undefined;
  const d = last?.dharmaCard;
  if (d) {
    const intent = (last?.intent ?? "").trim();
    const lead = intent ? `You set out to “${intent}”. ` : "";
    const phrase = expectedPhrase(d.expectedValidation);
    const validated = !!last?.phalCard?.validationDetected;
    if (phrase === "named no validation") {
      sub = validated
        ? `${lead}Your Dharma named no validation, yet you verified anyway — mindful work.`
        : `${lead}Your Dharma named no validation — let your next Phal speak through a test.`;
    } else {
      sub = validated
        ? `${lead}Your Dharma ${phrase}, and your Phal answered.`
        : `${lead}Your Dharma ${phrase}, yet your Phal went unverified.`;
    }
  }

  return { mood, headline, sub };
}
