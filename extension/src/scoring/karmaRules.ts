import { AgentKarmaEvent, ValidationCommandType } from "../core/types";

// The Karma Score, declared as a transparent rule table (scoring-model.md §3).
// Every point a session earns traces to exactly one named rule here — nothing is
// hidden in imperative branches. This is the deliberate contrast to opaque scoring
// engines: you can read every rule, its weight, and why it exists. Validation rules
// sum to 90; the prompt-hygiene hint is the only non-validation input, capped at 10.

/** The objective facts a session presents, distilled from its events. */
export interface KarmaFacts {
  ranTest: boolean;
  /** A REAL observed passing test exit code (not self-reported). */
  testsPassedObserved: boolean;
  buildRanClean: boolean;
  lintRanClean: boolean;
  testAlongsideCode: boolean;
  gitCaptured: boolean;
  /** Prompt-hygiene contribution, already scaled to 0–10. */
  promptHintPoints: number;
}

export interface KarmaRule {
  /** Stable id — safe to diff across sessions and releases. */
  id: string;
  /** Short label; also the exact prefix of the reason string (`<label> (+N)`). */
  label: string;
  /** Nominal weight when fully earned (for the Karma Rules reference). */
  maxPoints: number;
  /** What it rewards and why — shown verbatim in the rules reference. */
  description: string;
  /** Points this session earns from the rule (0 if not earned). */
  award: (f: KarmaFacts) => number;
}

export const KARMA_RULES: KarmaRule[] = [
  {
    id: "tests-run",
    label: "Tests run",
    maxPoints: 25,
    description:
      "You ran a test command during the session — the core act of verifying AI output.",
    award: (f) => (f.ranTest ? 25 : 0),
  },
  {
    id: "tests-passed",
    label: "Tests passed — observed",
    maxPoints: 10,
    description:
      "A real, observed passing test exit code — never self-reported. Observed beats logged.",
    award: (f) => (f.testsPassedObserved ? 10 : 0),
  },
  {
    id: "build-clean",
    label: "Build / type-check ran clean",
    maxPoints: 20,
    description:
      "A build or type check ran and did not fail — evidence the AI's change compiles / type-checks.",
    award: (f) => (f.buildRanClean ? 20 : 0),
  },
  {
    id: "lint-clean",
    label: "Lint ran clean",
    maxPoints: 15,
    description: "A linter ran and did not fail — catches issues the AI quietly introduced.",
    award: (f) => (f.lintRanClean ? 15 : 0),
  },
  {
    id: "test-alongside",
    label: "Test added/updated alongside code",
    maxPoints: 15,
    description:
      "You saved both a test file and non-test code — the change arrived with its test.",
    award: (f) => (f.testAlongsideCode ? 15 : 0),
  },
  {
    id: "change-measured",
    label: "Change measured",
    maxPoints: 5,
    description: "A git diff summary was captured, so the size of the change is known.",
    award: (f) => (f.gitCaptured ? 5 : 0),
  },
  {
    id: "prompt-hygiene",
    label: "Prompt hygiene hint",
    maxPoints: 10,
    description:
      "A soft, low-weight hint on prompt clarity — the only non-validation input, capped at 10%.",
    award: (f) => f.promptHintPoints,
  },
];

interface V {
  type: ValidationCommandType;
  result: string;
  source: string;
}

/** Distill a session's events into the objective facts the rules score. */
export function extractKarmaFacts(
  events: AgentKarmaEvent[],
  gitCaptured: boolean,
  promptHintScore: number
): KarmaFacts {
  const validations: V[] = events
    .filter((e) => e.type === "validation.command")
    .map((e) => ({
      type: e.data.commandType as ValidationCommandType,
      result: String(e.data.result),
      source: String(e.data.source),
    }));
  const files = events.filter((e) => e.type === "file.saved");
  const testFiles = files.filter((e) => e.data.isTestFile === true).length;
  const nonTestFiles = files.filter((e) => e.data.isTestFile !== true).length;

  const buildRan = validations.some((v) => v.type === "Build" || v.type === "Type Check");
  const buildFailed = validations.some(
    (v) => (v.type === "Build" || v.type === "Type Check") && v.result === "failed"
  );
  const lintRan = validations.some((v) => v.type === "Lint");
  const lintFailed = validations.some((v) => v.type === "Lint" && v.result === "failed");

  return {
    ranTest: validations.some((v) => v.type === "Test"),
    testsPassedObserved: validations.some(
      (v) => v.type === "Test" && v.result === "passed" && v.source === "observed"
    ),
    buildRanClean: buildRan && !buildFailed,
    lintRanClean: lintRan && !lintFailed,
    testAlongsideCode: testFiles > 0 && nonTestFiles > 0,
    gitCaptured,
    // Vacuous-truth rule lives in the facts: a "ran clean" fact is true only when the
    // command actually ran. Absence of a command is never treated as success.
    promptHintPoints: promptHintScore * 0.1,
  };
}

/** The reason string for an earned rule — format pinned for back-compat. */
export function reasonText(rule: KarmaRule, points: number): string {
  const shown = Number.isInteger(points) ? `${points}` : points.toFixed(1);
  return `${rule.label} (+${shown})`;
}
