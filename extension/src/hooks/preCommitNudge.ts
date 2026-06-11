import * as fs from "fs";
import * as path from "path";

// Opt-in pre-commit nudge (specification §13). The installed hook is a STANDALONE
// script (the extension host is not running at `git commit` time) that reads the
// on-disk store and prints a NON-BLOCKING reminder if the latest session logged no
// validation. Safety: never clobber an existing/foreign hook; always removable.

const MARKER = "AGENT-KARMA-HOOK";

export interface InstallResult {
  ok: boolean;
  reason?: string;
}

export interface ConflictInputs {
  hasHusky: boolean;
  hasLefthook: boolean;
  hasPreCommitConfig: boolean;
  existingHook: string | null;
}

/** Returns a human-readable reason we must NOT install, or null if safe. Pure. */
export function detectConflict(i: ConflictInputs): string | null {
  if (i.hasHusky) {
    return "This repo uses husky. Add the Agent Karma reminder to your husky pre-commit hook manually.";
  }
  if (i.hasLefthook) {
    return "This repo uses lefthook. Add the Agent Karma reminder to lefthook.yml manually.";
  }
  if (i.hasPreCommitConfig) {
    return "This repo uses the pre-commit framework. Add Agent Karma as a local hook manually.";
  }
  if (i.existingHook && !i.existingHook.includes(MARKER)) {
    return "A pre-commit hook already exists — Agent Karma will not overwrite it. Add the reminder manually if you'd like.";
  }
  return null;
}

/** Pure decision used by the hook checker (and unit-tested directly). */
export function shouldNudge(
  sessions: { id: string; title: string }[],
  events: { sessionId: string; type: string }[]
): { nudge: boolean; title?: string } {
  const last = sessions[sessions.length - 1];
  if (!last) {
    return { nudge: false };
  }
  const validated = events.some(
    (e) => e.sessionId === last.id && e.type === "validation.command"
  );
  return { nudge: !validated, title: last.title };
}

/** The standalone checker script written next to the data dir. Plain JS, no deps. */
export function buildCheckerScript(): string {
  return `// ${MARKER} checker (auto-generated). Non-blocking reminder; never fails a commit.
var fs = require("fs"), path = require("path");
var dir = process.argv[2];
try {
  var sessions = (JSON.parse(fs.readFileSync(path.join(dir, "sessions.json"), "utf8")).sessions) || [];
  var events = (JSON.parse(fs.readFileSync(path.join(dir, "events.json"), "utf8")).events) || [];
  var last = sessions[sessions.length - 1];
  if (last) {
    var validated = events.some(function (e) { return e.sessionId === last.id && e.type === "validation.command"; });
    if (!validated) {
      console.error("");
      console.error("Agent Karma reminder: no tests/build/lint were logged in your latest session (" + JSON.stringify(last.title) + ").");
      console.error("Consider validating AI-assisted changes before committing. (Reminder only - never blocks the commit.)");
      console.error("");
    }
  }
} catch (e) { /* never block the commit */ }
process.exit(0);
`;
}

/** The tiny sh hook that invokes the checker. Pure. */
export function buildHookScript(dataDir: string, checkerPath: string): string {
  return `#!/bin/sh
# ${MARKER} v1 — opt-in, non-blocking reminder from Agent Karma. Safe to delete.
node "${checkerPath}" "${dataDir}" 2>/dev/null || true
exit 0
`;
}

export function installHook(repoRoot: string, dataDir: string): InstallResult {
  const gitDir = path.join(repoRoot, ".git");
  if (!fs.existsSync(gitDir)) {
    return { ok: false, reason: "This folder is not a git repository." };
  }
  const hooksDir = path.join(gitDir, "hooks");
  const hookPath = path.join(hooksDir, "pre-commit");

  const conflict = detectConflict({
    hasHusky: fs.existsSync(path.join(repoRoot, ".husky")),
    hasLefthook:
      fs.existsSync(path.join(repoRoot, "lefthook.yml")) ||
      fs.existsSync(path.join(repoRoot, ".lefthook.yml")),
    hasPreCommitConfig: fs.existsSync(path.join(repoRoot, ".pre-commit-config.yaml")),
    existingHook: fs.existsSync(hookPath) ? fs.readFileSync(hookPath, "utf8") : null,
  });
  if (conflict) {
    return { ok: false, reason: conflict };
  }

  try {
    fs.mkdirSync(hooksDir, { recursive: true });
    fs.mkdirSync(dataDir, { recursive: true });
    const checkerPath = path.join(dataDir, "precommit-check.js");
    fs.writeFileSync(checkerPath, buildCheckerScript(), "utf8");
    fs.writeFileSync(hookPath, buildHookScript(dataDir, checkerPath), "utf8");
    fs.chmodSync(hookPath, 0o755);
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : "Could not write the hook." };
  }
}

export function removeHook(repoRoot: string): InstallResult {
  const hookPath = path.join(repoRoot, ".git", "hooks", "pre-commit");
  try {
    if (fs.existsSync(hookPath)) {
      const content = fs.readFileSync(hookPath, "utf8");
      if (!content.includes(MARKER)) {
        return { ok: false, reason: "The pre-commit hook is not Agent Karma's — leaving it untouched." };
      }
      fs.rmSync(hookPath, { force: true });
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : "Could not remove the hook." };
  }
}
