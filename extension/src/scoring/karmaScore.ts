import {
  AgentKarmaEvent,
  ScoreResult,
  KarmaScoreLabel,
  ValidationCommandType,
  KARMA_SCORE_BANDS,
  KARMA_EMA_ALPHA,
} from "../core/types";

// Objective Karma Score (scoring-model.md §3). Built ONLY from validation actions
// that were observed or logged — no feeling-based self-report. Validation rows = 90
// of 100; the prompt hygiene hint contributes at most 10.
//
// Vacuous-truth rule: a "ran clean" row scores points ONLY if the command actually
// ran. Absence of a command is never treated as success.
// Observed > logged: the "tests passed" bonus requires a REAL observed exit code.

export interface KarmaInput {
  events: AgentKarmaEvent[];
  gitCaptured: boolean;
  promptHintScore: number;
}

interface V {
  type: ValidationCommandType;
  result: string;
  source: string;
}

function labelFor(score: number): KarmaScoreLabel {
  return KARMA_SCORE_BANDS.find((b) => score >= b.min)!.label;
}

export function calculateKarmaScore(input: KarmaInput): ScoreResult {
  const validations: V[] = input.events
    .filter((e) => e.type === "validation.command")
    .map((e) => ({
      type: e.data.commandType as ValidationCommandType,
      result: String(e.data.result),
      source: String(e.data.source),
    }));
  const files = input.events.filter((e) => e.type === "file.saved");
  const testFiles = files.filter((e) => e.data.isTestFile === true).length;
  const nonTestFiles = files.filter((e) => e.data.isTestFile !== true).length;

  let raw = 0;
  const reasons: string[] = [];

  if (validations.some((v) => v.type === "Test")) {
    raw += 25;
    reasons.push("Tests run (+25)");
  }
  if (
    validations.some((v) => v.type === "Test" && v.result === "passed" && v.source === "observed")
  ) {
    raw += 10;
    reasons.push("Tests passed — observed (+10)");
  }

  const buildRan = validations.some((v) => v.type === "Build" || v.type === "Type Check");
  const buildFailed = validations.some(
    (v) => (v.type === "Build" || v.type === "Type Check") && v.result === "failed"
  );
  if (buildRan && !buildFailed) {
    raw += 20;
    reasons.push("Build / type-check ran clean (+20)");
  }

  const lintRan = validations.some((v) => v.type === "Lint");
  const lintFailed = validations.some((v) => v.type === "Lint" && v.result === "failed");
  if (lintRan && !lintFailed) {
    raw += 15;
    reasons.push("Lint ran clean (+15)");
  }

  if (testFiles > 0 && nonTestFiles > 0) {
    raw += 15;
    reasons.push("Test added/updated alongside code (+15)");
  }

  if (input.gitCaptured) {
    raw += 5;
    reasons.push("Change measured (+5)");
  }

  const promptPoints = input.promptHintScore * 0.1;
  if (promptPoints > 0) {
    raw += promptPoints;
    const shown = Number.isInteger(promptPoints) ? `${promptPoints}` : promptPoints.toFixed(1);
    reasons.push(`Prompt hygiene hint (+${shown})`);
  }

  const score = Math.min(100, Math.round(raw));
  return { score, label: labelFor(score), reasons };
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
