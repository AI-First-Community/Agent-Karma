// Validation Context Health — "Can you even validate?"
//
// A question no competitor asks: before we coach you on *whether* you validated
// the AI's work, does this workspace even give you the means to? We scan the repo
// (config only — never your source, never you) for the four locally-runnable
// validations (test / build / lint / type check) plus the safety net that catches
// a lapse for you (a pre-commit hook, CI, and whether your agent guidance file asks
// the AI to validate). The detection (impure fs reads) lives in the extension layer;
// this module is the pure assessment so it is fully unit-testable.

/** Raw booleans gathered from the workspace by the (impure) collector. */
export interface ReadinessSignals {
  /** package.json has a real `test` script (not the npm "no test specified" stub). */
  testScript: boolean;
  /** A known test runner is a dependency (vitest/jest/mocha/pytest/…). */
  testDep: boolean;
  /** A test-runner config file is present (vitest.config, jest.config, pytest.ini…). */
  testConfigFile: boolean;
  /** package.json has a `build` script. */
  buildScript: boolean;
  /** A tsconfig.json is present (enables build + type check for TS projects). */
  tsconfig: boolean;
  /** package.json has a `lint` script. */
  lintScript: boolean;
  /** A linter config file is present (.eslintrc*, eslint.config.*, ruff.toml…). */
  lintConfig: boolean;
  /** A known linter is a dependency (eslint/biome/ruff/…). */
  lintDep: boolean;
  /** package.json has a `typecheck`/`type-check`/`tsc` script. */
  typecheckScript: boolean;
  /** A CI workflow is present (.github/workflows, .gitlab-ci.yml, …). */
  ci: boolean;
  /** A pre-commit hook is installed (husky/lefthook/pre-commit/native, incl. ours). */
  preCommit: boolean;
  /** An agent guidance file (CLAUDE.md/AGENTS.md/.cursorrules/…) asks the AI to validate. */
  agentMentionsValidation: boolean;
}

export type ReadinessKey =
  | "test"
  | "build"
  | "lint"
  | "typecheck"
  | "preCommit"
  | "ci"
  | "agentGuidance";

export interface ReadinessCheck {
  key: ReadinessKey;
  label: string;
  present: boolean;
  /** What we found (present) or a one-line, copy-pasteable way to add it (absent). */
  detail: string;
}

export interface ValidationReadiness {
  checks: ReadinessCheck[];
  presentCount: number;
  total: number;
  /** Coarse 0–100 = present / total. Not a Karma score — a "can you validate?" gauge. */
  score: number;
  summary: string;
  /** The single highest-leverage missing support, if any (drives the recommendation). */
  topGap?: ReadinessCheck;
}

// Priority order for surfacing the *one* gap worth fixing first. Aligned to our
// thesis: the means to run a test matters most; the pre-commit hook is the net.
const GAP_PRIORITY: ReadinessKey[] = [
  "test",
  "lint",
  "preCommit",
  "build",
  "typecheck",
  "ci",
  "agentGuidance",
];

export function assessReadiness(s: ReadinessSignals): ValidationReadiness {
  const test = s.testScript || s.testDep || s.testConfigFile;
  const build = s.buildScript || s.tsconfig;
  const lint = s.lintScript || s.lintConfig || s.lintDep;
  const typecheck = s.typecheckScript || s.tsconfig;

  const checks: ReadinessCheck[] = [
    {
      key: "test",
      label: "Tests can run",
      present: test,
      detail: test
        ? "a test runner / `test` script is set up"
        : "add a test runner (e.g. `npm i -D vitest` + a `test` script) so you can verify AI changes",
    },
    {
      key: "lint",
      label: "Lint can run",
      present: lint,
      detail: lint
        ? "a linter is configured"
        : "add a linter (e.g. ESLint / Ruff) to catch issues the AI introduces",
    },
    {
      key: "build",
      label: "Build can run",
      present: build,
      detail: build
        ? "a build / tsconfig is present"
        : "add a `build` script so a broken AI change fails loudly",
    },
    {
      key: "typecheck",
      label: "Types can be checked",
      present: typecheck,
      detail: typecheck
        ? "a type checker (tsconfig) is present"
        : "add type checking (e.g. a `typecheck` script running `tsc --noEmit`)",
    },
    {
      key: "preCommit",
      label: "A pre-commit net exists",
      present: s.preCommit,
      detail: s.preCommit
        ? "a pre-commit hook guards your commits"
        : "install the Agent Karma pre-commit nudge (or husky/lefthook) to catch unvalidated commits",
    },
    {
      key: "ci",
      label: "CI runs your checks",
      present: s.ci,
      detail: s.ci
        ? "CI is configured"
        : "add CI (e.g. a GitHub Actions workflow) so checks run on every push",
    },
    {
      key: "agentGuidance",
      label: "Your agent is told to validate",
      present: s.agentMentionsValidation,
      detail: s.agentMentionsValidation
        ? "your agent guidance file asks the AI to validate"
        : "add a line to CLAUDE.md / AGENTS.md telling the AI to run tests/lint before finishing",
    },
  ];

  const presentCount = checks.filter((c) => c.present).length;
  const total = checks.length;
  const score = Math.round((presentCount / total) * 100);

  const topGap = GAP_PRIORITY.map((k) => checks.find((c) => c.key === k)).find(
    (c): c is ReadinessCheck => !!c && !c.present
  );

  const canValidateLocally = test || build || lint || typecheck;
  let summary: string;
  if (!canValidateLocally) {
    summary =
      "This workspace has no test, build, lint, or type check set up — there's nothing to validate AI output against yet.";
  } else if (!topGap) {
    summary = "Fully equipped to validate — every support is in place.";
  } else {
    summary = `${presentCount} of ${total} validation supports in place.`;
  }

  return { checks, presentCount, total, score, summary, topGap };
}
