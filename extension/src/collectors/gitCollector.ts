import { execFile } from "child_process";
import { GitDiffSummary } from "../core/types";

// Git diff summary (specification §8): counts only, never diff content.
// Runs `git diff HEAD --numstat` per workspace folder and sums. Degrades to
// captured:false (never throws) when git is absent / not a repo / times out.

/** Parse `git diff --numstat` output into counts. Pure and testable. */
export function parseNumstat(stdout: string): {
  filesChanged: number;
  linesAdded: number;
  linesDeleted: number;
} {
  let filesChanged = 0;
  let linesAdded = 0;
  let linesDeleted = 0;
  for (const line of stdout.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    const parts = trimmed.split(/\t/);
    if (parts.length < 3) {
      continue;
    }
    filesChanged++;
    const added = parseInt(parts[0], 10); // "-" (binary) → NaN → ignored
    const deleted = parseInt(parts[1], 10);
    if (!Number.isNaN(added)) {
      linesAdded += added;
    }
    if (!Number.isNaN(deleted)) {
      linesDeleted += deleted;
    }
  }
  return { filesChanged, linesAdded, linesDeleted };
}

function runGit(cwd: string): Promise<{ ok: boolean; stdout: string; error?: string }> {
  return new Promise((resolve) => {
    execFile(
      "git",
      ["diff", "HEAD", "--numstat"],
      { cwd, timeout: 5000, windowsHide: true, maxBuffer: 10 * 1024 * 1024 },
      (err, stdout) => {
        if (err) {
          resolve({ ok: false, stdout: "", error: err.message });
        } else {
          resolve({ ok: true, stdout });
        }
      }
    );
  });
}

/**
 * Summarize working-tree changes across the given folders. `git diff HEAD`
 * captures staged + unstaged. Folders that are not repos are skipped; if at least
 * one folder yields a diff, captured is true.
 */
export async function getGitDiffSummary(cwds: string[]): Promise<GitDiffSummary> {
  const agg = { filesChanged: 0, linesAdded: 0, linesDeleted: 0 };
  if (cwds.length === 0) {
    return { ...agg, captured: false, error: "no workspace folder" };
  }
  let anyCaptured = false;
  let lastError: string | undefined;
  for (const cwd of cwds) {
    const { ok, stdout, error } = await runGit(cwd);
    if (ok) {
      const p = parseNumstat(stdout);
      agg.filesChanged += p.filesChanged;
      agg.linesAdded += p.linesAdded;
      agg.linesDeleted += p.linesDeleted;
      anyCaptured = true;
    } else {
      lastError = error;
    }
  }
  return anyCaptured
    ? { ...agg, captured: true }
    : { ...agg, captured: false, error: lastError };
}
