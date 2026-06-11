import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import {
  detectConflict,
  shouldNudge,
  buildHookScript,
  buildCheckerScript,
  installHook,
  removeHook,
} from "./preCommitNudge";

describe("detectConflict", () => {
  it("is safe (null) on a clean repo", () => {
    expect(detectConflict({ hasHusky: false, hasLefthook: false, hasPreCommitConfig: false, existingHook: null })).toBeNull();
  });
  it("declines husky / lefthook / pre-commit framework", () => {
    expect(detectConflict({ hasHusky: true, hasLefthook: false, hasPreCommitConfig: false, existingHook: null })).toMatch(/husky/i);
    expect(detectConflict({ hasHusky: false, hasLefthook: true, hasPreCommitConfig: false, existingHook: null })).toMatch(/lefthook/i);
    expect(detectConflict({ hasHusky: false, hasLefthook: false, hasPreCommitConfig: true, existingHook: null })).toMatch(/pre-commit/i);
  });
  it("declines a foreign existing hook but allows our own", () => {
    expect(detectConflict({ hasHusky: false, hasLefthook: false, hasPreCommitConfig: false, existingHook: "#!/bin/sh\nnpm test" })).toMatch(/already exists/i);
    expect(detectConflict({ hasHusky: false, hasLefthook: false, hasPreCommitConfig: false, existingHook: "# AGENT-KARMA-HOOK v1" })).toBeNull();
  });
});

describe("shouldNudge", () => {
  it("nudges when the latest session has no validation", () => {
    const r = shouldNudge([{ id: "s1", title: "Fix bug" }], [{ sessionId: "s1", type: "file.saved" }]);
    expect(r.nudge).toBe(true);
    expect(r.title).toBe("Fix bug");
  });
  it("does not nudge when validation was logged", () => {
    const r = shouldNudge([{ id: "s1", title: "Fix bug" }], [{ sessionId: "s1", type: "validation.command" }]);
    expect(r.nudge).toBe(false);
  });
  it("does not nudge with no sessions", () => {
    expect(shouldNudge([], []).nudge).toBe(false);
  });
});

describe("hook scripts", () => {
  it("hook carries the marker and invokes the checker with the data dir", () => {
    const hook = buildHookScript("/data dir", "/data dir/precommit-check.js");
    expect(hook).toContain("AGENT-KARMA-HOOK");
    expect(hook).toContain(`node "/data dir/precommit-check.js" "/data dir"`);
    expect(hook).toContain("exit 0");
  });
  it("checker is valid JS and references the validation guard", () => {
    const checker = buildCheckerScript();
    expect(() => new Function(checker)).not.toThrow();
    expect(checker).toContain("validation.command");
  });
});

describe("installHook / removeHook", () => {
  let repo: string;
  let dataDir: string;

  beforeEach(() => {
    repo = fs.mkdtempSync(path.join(os.tmpdir(), "ak-repo-"));
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "ak-data-"));
  });
  afterEach(() => {
    fs.rmSync(repo, { recursive: true, force: true });
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  it("fails when the folder is not a git repo", () => {
    expect(installHook(repo, dataDir).ok).toBe(false);
  });

  it("installs and removes cleanly in a git repo", () => {
    fs.mkdirSync(path.join(repo, ".git", "hooks"), { recursive: true });
    const res = installHook(repo, dataDir);
    expect(res.ok).toBe(true);
    const hookPath = path.join(repo, ".git", "hooks", "pre-commit");
    expect(fs.existsSync(hookPath)).toBe(true);
    expect(fs.existsSync(path.join(dataDir, "precommit-check.js"))).toBe(true);

    expect(removeHook(repo).ok).toBe(true);
    expect(fs.existsSync(hookPath)).toBe(false);
  });

  it("refuses to clobber a foreign pre-commit hook", () => {
    const hooks = path.join(repo, ".git", "hooks");
    fs.mkdirSync(hooks, { recursive: true });
    fs.writeFileSync(path.join(hooks, "pre-commit"), "#!/bin/sh\nnpm run lint\n");
    const res = installHook(repo, dataDir);
    expect(res.ok).toBe(false);
    expect(res.reason).toMatch(/already exists/i);
    // and remove leaves the foreign hook untouched
    expect(removeHook(repo).ok).toBe(false);
    expect(fs.existsSync(path.join(hooks, "pre-commit"))).toBe(true);
  });
});
