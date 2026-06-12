import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { aggregateClaudeUsage, ClaudeUsage } from "./claudeUsage";

// Impure half: locate the current workspace's Claude Code session logs on local disk
// and feed their lines to the pure aggregator. Local file reads only — no network.
// Best-effort: any failure returns null rather than throwing.

// Claude Code encodes the workspace path into the project dir name (each non-alphanumeric
// char → '-'), e.g. /Users/me/Foo_Bar → -Users-me-Foo-Bar.
function encodeProjectDir(cwd: string): string {
  return cwd.replace(/[^a-zA-Z0-9]/g, "-");
}

const MAX_FILE_BYTES = 60 * 1024 * 1024; // skip pathologically large logs

export function readClaudeUsage(cwd: string, home = os.homedir()): ClaudeUsage | null {
  try {
    const dir = path.join(home, ".claude", "projects", encodeProjectDir(cwd));
    if (!fs.existsSync(dir)) {
      return null;
    }
    const files = fs.readdirSync(dir).filter((f) => f.endsWith(".jsonl"));
    if (files.length === 0) {
      return null;
    }
    const lines: string[] = [];
    for (const f of files) {
      try {
        const full = path.join(dir, f);
        if (fs.statSync(full).size > MAX_FILE_BYTES) {
          continue;
        }
        for (const ln of fs.readFileSync(full, "utf8").split("\n")) {
          if (ln) {
            lines.push(ln);
          }
        }
      } catch {
        // skip unreadable file
      }
    }
    const usage = aggregateClaudeUsage(lines);
    return usage.turns > 0 ? usage : null;
  } catch {
    return null;
  }
}
