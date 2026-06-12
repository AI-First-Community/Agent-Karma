import { AgentKarmaSession } from "../core/types";
import { DashboardStats } from "./dashboardStats";

// An inspiring, Dharma/Karma/Phal-framed reflection of the developer's current state.
// The metaphor IS the thesis: unvalidated Karma (action) bears uncertain Phal (fruit).
// Always encouraging, never shaming — a low state reads as "unresolved", not "bad".

export type KarmicMood = "luminous" | "steady" | "forming" | "dim";

export interface KarmicMessage {
  mood: KarmicMood;
  /** The headline reflection (one evocative line). */
  headline: string;
  /** Optional Dharma→Phal sub-line tied to the most recent session. */
  sub?: string;
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
  stats: Pick<DashboardStats, "rollingKarma" | "consistency">,
  last?: AgentKarmaSession
): KarmicMessage {
  const k = stats.rollingKarma;
  if (k === undefined) {
    return {
      mood: "forming",
      headline: "Every act of validation is Karma you can trust.",
      sub: "Set your intention, work with the AI, then verify what it gives you — and watch your Karma take shape.",
    };
  }

  const c = stats.consistency;
  const consistent = !!c && c.total >= 3 && c.validatedCount / c.total >= 0.6;

  let mood: KarmicMood;
  let headline: string;
  if (k >= 80 && consistent) {
    mood = "luminous";
    headline = "Your Karma is luminous — you verify with intention, and your work bears fruit you can trust.";
  } else if (k >= 60) {
    mood = "steady";
    headline = "Your Karma is steady — more often than not, you check before you trust. Hold the line.";
  } else if (k >= 40) {
    mood = "forming";
    headline = "Your Karma is forming — each validation is a step from doubt toward mastery.";
  } else {
    mood = "dim";
    headline = "Your Karma is dim — much went unverified. No judgment; run a single check and watch it brighten.";
  }

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
