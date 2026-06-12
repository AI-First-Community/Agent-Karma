import {
  AgentKarmaEvent,
  ScoreResult,
  KarmaScoreLabel,
  KarmaRuleResult,
  KARMA_SCORE_BANDS,
  KARMA_EMA_ALPHA,
} from "../core/types";
import { KARMA_RULES, extractKarmaFacts, reasonText } from "./karmaRules";

// Objective Karma Score (scoring-model.md §3). Built ONLY from validation actions
// that were observed or logged — no feeling-based self-report. Validation rules = 90
// of 100; the prompt hygiene hint contributes at most 10.
//
// The rules themselves live in karmaRules.ts as a declared, readable table; this
// module just evaluates it so every point is traceable to a named rule.

export interface KarmaInput {
  events: AgentKarmaEvent[];
  gitCaptured: boolean;
  promptHintScore: number;
}

function labelFor(score: number): KarmaScoreLabel {
  return KARMA_SCORE_BANDS.find((b) => score >= b.min)!.label;
}

export function calculateKarmaScore(input: KarmaInput): ScoreResult {
  const facts = extractKarmaFacts(input.events, input.gitCaptured, input.promptHintScore);

  let raw = 0;
  const reasons: string[] = [];
  const breakdown: KarmaRuleResult[] = [];

  for (const rule of KARMA_RULES) {
    const points = rule.award(facts);
    const earned = points > 0;
    breakdown.push({
      id: rule.id,
      label: rule.label,
      points,
      maxPoints: rule.maxPoints,
      earned,
      description: rule.description,
    });
    if (earned) {
      raw += points;
      reasons.push(reasonText(rule, points));
    }
  }

  const score = Math.min(100, Math.round(raw));
  return { score, label: labelFor(score), reasons, breakdown };
}

/** Update the self-comparative EMA (scoring-model §3.3). Seeds to the first score. */
export function nextEma(prevEma: number | undefined, score: number): number {
  return prevEma === undefined
    ? score
    : KARMA_EMA_ALPHA * score + (1 - KARMA_EMA_ALPHA) * prevEma;
}

/** Trend vs. the user's own prior EMA (±3 band). First session → flat. */
export function computeTrend(
  score: number,
  prevEma: number | undefined
): "up" | "down" | "flat" {
  if (prevEma === undefined) {
    return "flat";
  }
  if (score - prevEma > 3) {
    return "up";
  }
  if (score - prevEma < -3) {
    return "down";
  }
  return "flat";
}
