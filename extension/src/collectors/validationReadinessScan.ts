import * as fs from "fs";
import * as path from "path";
import { ReadinessSignals } from "./validationReadiness";

// Impure half of Validation Context Health: gather raw signals from a workspace
// folder. Config-only — we read package.json, well-known config filenames, and the
// agent guidance file's text (looking for the word "validate"/"test"/"lint"). We
// never read your source files. Best-effort: any read error degrades to "absent",
// never throws.

const TEST_DEPS = [
  "vitest", "jest", "mocha", "ava", "jasmine", "@playwright/test", "playwright",
  "cypress", "node-tap", "tap", "uvu",
];
const LINT_DEPS = [
  "eslint", "@biomejs/biome", "biome", "ruff", "flake8", "pylint", "standard",
  "xo", "oxlint", "tslint",
];

const TEST_CONFIG_FILES = [
  "vitest.config.ts", "vitest.config.js", "vitest.config.mjs", "vitest.config.cjs",
  "jest.config.ts", "jest.config.js", "jest.config.mjs", "jest.config.cjs", "jest.config.json",
  "playwright.config.ts", "playwright.config.js", "cypress.config.ts", "cypress.config.js",
  "pytest.ini", "tox.ini",
];
const LINT_CONFIG_FILES = [
  ".eslintrc", ".eslintrc.js", ".eslintrc.cjs", ".eslintrc.json", ".eslintrc.yml", ".eslintrc.yaml",
  "eslint.config.js", "eslint.config.mjs", "eslint.config.cjs", "eslint.config.ts",
  "biome.json", "biome.jsonc", "ruff.toml", ".ruff.toml", ".flake8", ".pylintrc",
];
const CI_PATHS = [
  ".github/workflows", ".gitlab-ci.yml", "azure-pipelines.yml",
  ".circleci/config.yml", "bitbucket-pipelines.yml", ".travis.yml",
];
const PRECOMMIT_PATHS = [
  ".husky/pre-commit", ".pre-commit-config.yaml", "lefthook.yml", "lefthook.yaml",
  "lefthook.toml", ".git/hooks/pre-commit",
];
const AGENT_GUIDANCE_FILES = [
  "CLAUDE.md", "AGENTS.md", ".cursorrules", ".windsurfrules",
  ".github/copilot-instructions.md", "GEMINI.md",
];
const GUIDANCE_KEYWORDS = ["validate", "test", "lint", "type check", "typecheck", "build"];

function exists(root: string, rel: string): boolean {
  try {
    return fs.existsSync(path.join(root, rel));
  } catch {
    return false;
  }
}

function nonEmptyDir(root: string, rel: string): boolean {
  try {
    const p = path.join(root, rel);
    return fs.statSync(p).isDirectory() && fs.readdirSync(p).length > 0;
  } catch {
    return false;
  }
}

function readJson(root: string, rel: string): Record<string, unknown> | null {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, rel), "utf8"));
  } catch {
    return null;
  }
}

function readText(root: string, rel: string): string {
  try {
    return fs.readFileSync(path.join(root, rel), "utf8");
  } catch {
    return "";
  }
}

export function scanReadinessSignals(root: string): ReadinessSignals {
  const pkg = readJson(root, "package.json") ?? {};
  const scripts = (pkg.scripts as Record<string, string> | undefined) ?? {};
  const deps = Object.keys({
    ...((pkg.dependencies as Record<string, string> | undefined) ?? {}),
    ...((pkg.devDependencies as Record<string, string> | undefined) ?? {}),
  }).map((d) => d.toLowerCase());

  const hasDep = (list: string[]): boolean => deps.some((d) => list.includes(d));
  const testStub = /no test specified/i;
  const typecheckScripts = ["typecheck", "type-check", "tsc", "check-types", "check:types"];

  // Pre-commit: any known framework's hook, OR a non-sample native hook (incl. ours).
  const preCommit =
    PRECOMMIT_PATHS.some((p) => exists(root, p)) ||
    readText(root, ".git/hooks/pre-commit").includes("AGENT-KARMA-HOOK");

  // CI: the workflows dir must be non-empty; the single-file CIs just need to exist.
  const ci =
    nonEmptyDir(root, ".github/workflows") ||
    CI_PATHS.slice(1).some((p) => exists(root, p));

  const guidance = AGENT_GUIDANCE_FILES.map((f) => readText(root, f)).join("\n").toLowerCase();
  const agentMentionsValidation =
    guidance.length > 0 && GUIDANCE_KEYWORDS.some((k) => guidance.includes(k));

  return {
    testScript: typeof scripts.test === "string" && !testStub.test(scripts.test),
    testDep: hasDep(TEST_DEPS),
    testConfigFile: TEST_CONFIG_FILES.some((f) => exists(root, f)),
    buildScript: typeof scripts.build === "string",
    tsconfig: exists(root, "tsconfig.json"),
    lintScript: typeof scripts.lint === "string",
    lintConfig: LINT_CONFIG_FILES.some((f) => exists(root, f)),
    lintDep: hasDep(LINT_DEPS),
    typecheckScript: typecheckScripts.some((s) => typeof scripts[s] === "string"),
    ci,
    preCommit,
    agentMentionsValidation,
  };
}
