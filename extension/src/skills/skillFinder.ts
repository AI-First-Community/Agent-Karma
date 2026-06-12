import { ValidationCommandType } from "../core/types";
import { ReadinessSignals } from "../collectors/validationReadiness";

// Validation Skill Finder — turn "what you keep skipping" + "what net you lack" into
// the single highest-leverage next step, with a one-click fix where we have one.
// It closes the loop: Context Health says you lack the net; your own history says
// which validation you skip; this proposes the concrete fix. Pure + unit-tested.

export interface SkillFinderInput {
  /** How many recent sessions the skip rates are computed over. */
  recentCount: number;
  /** % of recent sessions that did NOT run each check (0–100). */
  skipRates: { type: ValidationCommandType; skipRate: number }[];
  signals: ReadinessSignals;
  /** Can we offer a literal one-click pre-commit install? (git repo + not installed) */
  preCommitInstallable: boolean;
}

export type SkillAction =
  | { kind: "install-precommit" }
  | { kind: "guidance"; steps: string[] };

export interface SkillSuggestion {
  id: string;
  severity: "high" | "medium" | "low";
  title: string;
  rationale: string;
  action: SkillAction;
}

/** Does the workspace have the *means* to run a given check at all? */
function meansFor(type: ValidationCommandType, s: ReadinessSignals): boolean {
  switch (type) {
    case "Test":
      return s.testScript || s.testDep || s.testConfigFile;
    case "Lint":
      return s.lintScript || s.lintConfig || s.lintDep;
    case "Build":
      return s.buildScript || s.tsconfig;
    case "Type Check":
      return s.typecheckScript || s.tsconfig;
    default:
      return true;
  }
}

const SETUP_STEPS: Partial<Record<ValidationCommandType, string[]>> = {
  Test: [
    "Add a test runner, e.g. `npm i -D vitest`",
    'Add a `"test"` script to package.json',
    "Run `npm test` to verify AI changes",
  ],
  Lint: [
    "Add a linter, e.g. `npm i -D eslint`",
    'Add a `"lint"` script (e.g. `eslint .`)',
    "Run it before committing AI changes",
  ],
  "Type Check": [
    "Add a `tsconfig.json` (`npx tsc --init`)",
    'Add a `"typecheck"` script: `tsc --noEmit`',
    "Run it to catch type errors the AI introduced",
  ],
};

const SKIP_THRESHOLD = 40; // % of recent sessions skipping a check before we flag it

/**
 * Rank concrete next steps. At most a few, highest-leverage first. The pre-commit net
 * is the headline because it is the one fix we can apply in a single click.
 */
export function findSkills(input: SkillFinderInput): SkillSuggestion[] {
  const out: SkillSuggestion[] = [];
  const gaps = input.skipRates
    .filter((s) => s.skipRate >= SKIP_THRESHOLD)
    .sort((a, b) => b.skipRate - a.skipRate);
  const enoughHistory = input.recentCount >= 3;

  // 1. The pre-commit net — the one-click fix, when you have a habit gap and no net.
  if (!input.signals.preCommit && enoughHistory && gaps.length > 0) {
    const worst = gaps[0];
    out.push({
      id: "precommit-net",
      severity: "high",
      title: "Set up a pre-commit validation net",
      rationale: `You skipped ${worst.type} on ${worst.skipRate}% of your recent AI sessions, and there's no pre-commit hook to catch an unvalidated commit.`,
      action: input.preCommitInstallable
        ? { kind: "install-precommit" }
        : {
            kind: "guidance",
            steps: [
              "Initialise a git repo here (`git init`) if you haven't",
              "Then run **Agent Karma: Install Pre-Commit Nudge**",
            ],
          },
    });
  }

  // 2. A check you skip a lot AND can't actually run — add the means.
  const missingMeans = gaps.find((g) => !meansFor(g.type, input.signals) && SETUP_STEPS[g.type]);
  if (missingMeans) {
    out.push({
      id: `add-means-${missingMeans.type.toLowerCase().replace(/\s+/g, "-")}`,
      severity: "medium",
      title: `Make ${missingMeans.type} runnable`,
      rationale: `${missingMeans.type} ran in almost none of your recent sessions — and this workspace has no ${missingMeans.type.toLowerCase()} set up to run.`,
      action: { kind: "guidance", steps: SETUP_STEPS[missingMeans.type]! },
    });
  }

  // 3. Tell your agent to validate — cheapest, most overlooked lever.
  if (!input.signals.agentMentionsValidation) {
    out.push({
      id: "agent-guidance",
      severity: "low",
      title: "Tell your AI to validate its own work",
      rationale:
        "Your agent guidance file doesn't ask the AI to run tests/lint — adding one line makes validation the default, not an afterthought.",
      action: {
        kind: "guidance",
        steps: [
          "Open (or create) CLAUDE.md / AGENTS.md at your repo root",
          'Add: "Always run the tests and the linter before finishing a task, and report the results."',
        ],
      },
    });
  }

  return out;
}
