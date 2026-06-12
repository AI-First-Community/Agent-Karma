import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { SessionManager } from "../core/sessionManager";
import { AgentKarmaSettings } from "../core/types";
import { asEventData } from "../privacy/privacyRules";
import { latestCommitSha } from "../utils/gitReflog";

/**
 * Records git commits into the active session by watching `.git/logs/HEAD`.
 *
 * Commits made from the CLI or an AI coding agent never reach VS Code's APIs, but
 * every commit appends to the reflog — so that's the one reliable place to see them.
 * - active-session-gated (and master-switch gated)
 * - metadata only: the short commit hash, never the message, diff, files, or author
 * - deduped by SHA (a reflog write can fire the watcher more than once)
 * - records commits only; does NOT touch the Karma score (which stays validation-based)
 */
export class GitCommitCollector {
  private readonly disposables: vscode.Disposable[] = [];
  private logHeadPath: string | null = null;
  private lastSha: string | null = null;

  constructor(
    private readonly manager: SessionManager,
    private readonly getSettings: () => AgentKarmaSettings
  ) {
    const gitDir = resolveGitDir();
    if (!gitDir) {
      return; // not a git repository — nothing to watch
    }
    this.logHeadPath = path.join(gitDir, "logs", "HEAD");
    this.lastSha = this.readCurrentSha(); // baseline so the pre-existing HEAD doesn't fire

    const watcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(vscode.Uri.file(gitDir), "logs/HEAD")
    );
    const onChange = (): void => this.check();
    watcher.onDidChange(onChange);
    watcher.onDidCreate(onChange);
    this.disposables.push(watcher);
  }

  private readCurrentSha(): string | null {
    try {
      if (!this.logHeadPath || !fs.existsSync(this.logHeadPath)) {
        return null;
      }
      return latestCommitSha(fs.readFileSync(this.logHeadPath, "utf8"));
    } catch {
      return null;
    }
  }

  private check(): void {
    if (!this.manager.hasActiveSession()) {
      return;
    }
    if (!this.getSettings().enabled) {
      return; // master switch off — no passive capture
    }
    const sha = this.readCurrentSha();
    if (!sha || sha === this.lastSha) {
      return; // unchanged, or the latest reflog entry wasn't a commit
    }
    this.lastSha = sha;
    this.manager.recordForActiveSession("git.commit", asEventData({ sha }));
  }

  dispose(): void {
    this.disposables.forEach((d) => d.dispose());
  }
}

/** Resolve the real `.git` directory for the first workspace folder (handles the
 * worktree/submodule case where `.git` is a `gitdir: …` pointer file). */
function resolveGitDir(): string | null {
  const folder = vscode.workspace.workspaceFolders?.[0];
  if (!folder) {
    return null;
  }
  const root = folder.uri.fsPath;
  const dotGit = path.join(root, ".git");
  try {
    const stat = fs.statSync(dotGit);
    if (stat.isDirectory()) {
      return dotGit;
    }
    if (stat.isFile()) {
      const m = /gitdir:\s*(.+)/.exec(fs.readFileSync(dotGit, "utf8"));
      if (m) {
        const target = m[1].trim();
        return path.isAbsolute(target) ? target : path.join(root, target);
      }
    }
  } catch {
    /* not a repo / unreadable */
  }
  return null;
}
