import * as fs from "fs";
import * as path from "path";
import { ReadinessSignals } from "./validationReadiness";

// Impure half of Validation Context Health: gather raw signals from a workspace
// folder. Config-only — we read package.json, well-known config filenames, and the
// agent guidance file's text (looking for the word "validate"/"test"/"lint"). We
// never read your source files. Best-effort: any read error degrades to "absent",
// never throws.
//
// Monorepo / subfolder aware: the validation setup often lives BELOW the workspace
// root (tests in `extension/`, `packages/*`, `apps/*`). We scan the root AND those
// nested package roots and OR the signals, so a repo isn't falsely reported as
// "nothing to validate against" just because its package.json isn't at the top.

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

// Directories we never descend into when discovering nested packages.
const SKIP_DIRS = new Set([
  "node_modules", ".git", "dist", "out", "build", "coverage",
  ".vscode-test", ".next", ".nuxt", ".turbo", ".cache",
  "__pycache__", ".pytest_cache", ".mypy_cache", "target", "vendor",
]);

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
    const parsed = JSON.parse(fs.readFileSync(path.join(root, rel), "utf8"));
    // Only a JSON object is a usable manifest; a valid-but-non-object (array,
    // string, number) must not be cast to a record — guard against a latent crash.
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
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

/** Gather signals from ONE folder. */
function scanOneRoot(root: string): ReadinessSignals {
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

/**
 * Discover nested package roots so monorepos / subfolder apps aren't reported as
 * "can't validate" when the setup lives below the workspace root. Depth-bounded
 * and best-effort: immediate child directories that contain a package.json, plus
 * one level under the conventional `packages/` and `apps/` monorepo directories.
 */
export function findNestedPackageRoots(root: string): string[] {
  const found = new Set<string>();

  const childDirs = (dir: string): string[] => {
    try {
      return fs
        .readdirSync(dir, { withFileTypes: true })
        .filter((e) => e.isDirectory() && !SKIP_DIRS.has(e.name) && !e.name.startsWith("."))
        .map((e) => path.join(dir, e.name));
    } catch {
      return [];
    }
  };
  const addIfPackage = (dir: string): void => {
    if (exists(dir, "package.json")) {
      found.add(dir);
    }
  };

  // Immediate children (catches an app living in e.g. extension/).
  childDirs(root).forEach(addIfPackage);
  // One level under conventional monorepo parents.
  for (const parent of ["packages", "apps"]) {
    childDirs(path.join(root, parent)).forEach(addIfPackage);
  }

  return [...found].slice(0, 50); // hard cap — never walk an unbounded tree
}

/** OR two readiness signal sets — a repo "can validate" if ANY package can. */
function orSignals(a: ReadinessSignals, b: ReadinessSignals): ReadinessSignals {
  return {
    testScript: a.testScript || b.testScript,
    testDep: a.testDep || b.testDep,
    testConfigFile: a.testConfigFile || b.testConfigFile,
    buildScript: a.buildScript || b.buildScript,
    tsconfig: a.tsconfig || b.tsconfig,
    lintScript: a.lintScript || b.lintScript,
    lintConfig: a.lintConfig || b.lintConfig,
    lintDep: a.lintDep || b.lintDep,
    typecheckScript: a.typecheckScript || b.typecheckScript,
    ci: a.ci || b.ci,
    preCommit: a.preCommit || b.preCommit,
    agentMentionsValidation: a.agentMentionsValidation || b.agentMentionsValidation,
  };
}

/**
 * Aggregate readiness signals across the workspace root AND any nested package
 * roots, so the reported status is honest for subfolder/monorepo layouts (the
 * app under `extension/`, `packages/*`, `apps/*`) instead of only the top folder.
 */
export function scanReadinessSignals(root: string): ReadinessSignals {
  const roots = [root, ...findNestedPackageRoots(root)];
  return roots.map(scanOneRoot).reduce(orSignals);
}
