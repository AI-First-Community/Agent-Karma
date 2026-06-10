import { AgentKarmaEvent } from "../core/types";

// Karma Trace (specification §9): a chronological, human-readable timeline of a
// session's events. Pure and testable. Metadata only — no source, no raw commands.

const LABELS: Record<string, string> = {
  "session.started": "Session started",
  "intent.captured": "Intent captured",
  "prompt.scored": "Prompt scored",
  "dharma.generated": "Dharma Card generated",
  "file.saved": "File saved",
  "validation.command": "Validation command",
  "git.diff.summary": "Git diff summary captured",
  "karma.score.generated": "Karma Score generated",
  "phal.generated": "Phal Card generated",
  "outcome.reported": "Outcome noted",
  "session.ended": "Session ended",
};

function hhmm(iso: string): string {
  // ISO-8601 → "HH:MM" (positions 11–16). Falls back to the raw value if malformed.
  return iso.length >= 16 ? iso.slice(11, 16) : iso;
}

export function buildKarmaTrace(events: AgentKarmaEvent[]): string[] {
  return [...events]
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
    .map((e) => {
      let detail = LABELS[e.type] ?? e.type;
      if (e.type === "file.saved" && typeof e.data.fileName === "string") {
        detail = `File saved: ${e.data.fileName}`;
      } else if (e.type === "validation.command") {
        detail = `Validation: ${String(e.data.commandType)} (${String(e.data.result)})`;
      } else if (e.type === "git.diff.summary") {
        detail = `Git diff: ${e.data.filesChanged} files, +${e.data.linesAdded} / -${e.data.linesDeleted}`;
      }
      return `${hhmm(e.timestamp)} ${detail}`;
    });
}
