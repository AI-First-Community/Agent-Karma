// Git reflog parsing (pure, testable — no vscode/fs).
//
// A `.git/logs/HEAD` line looks like:
//   <old-sha> <new-sha> <author> <unix-ts> <tz>\t<message>
// where <message> is "commit: …", "commit (amend): …", "commit (initial): …",
// "checkout: …", "merge …", "pull …", "reset: …", etc.

/**
 * Short SHA (≤10 chars) of the latest entry in a `logs/HEAD` reflog **iff** that
 * entry is a commit; otherwise null (checkout / merge / reset / pull / rebase
 * bookkeeping). Lets the collector record real commits and ignore ref churn.
 */
export function latestCommitSha(logHeadContent: string): string | null {
  const lines = logHeadContent.replace(/\s+$/, "").split(/\r?\n/);
  const last = lines[lines.length - 1];
  if (!last) {
    return null;
  }
  const tab = last.indexOf("\t");
  if (tab < 0) {
    return null;
  }
  const message = last.slice(tab + 1);
  if (!/^commit\b/.test(message)) {
    return null; // commit, commit (amend), commit (initial) only
  }
  const newSha = last.slice(0, tab).split(" ")[1] ?? "";
  return /^[0-9a-f]{7,40}$/i.test(newSha) ? newSha.slice(0, 10) : null;
}
