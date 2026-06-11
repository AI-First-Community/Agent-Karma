import { AgentKarmaSession, AgentKarmaEvent } from "../core/types";
import { buildKarmaTrace } from "../cards/karmaTrace";

// Markdown export (specification §12): a human-readable session summary. Metadata
// only — same privacy guarantees as the JSON export.

export function toMarkdown(
  session: AgentKarmaSession,
  events: AgentKarmaEvent[]
): string {
  const lines: string[] = [];
  const sessionEvents = events.filter((e) => e.sessionId === session.id);

  lines.push("# Agent Karma Session Summary", "");
  lines.push("## Session");
  lines.push(`- Title: ${session.title}`);
  lines.push(`- AI Tool: ${session.aiTool}`);
  lines.push(`- Task Type: ${session.taskType}`);
  lines.push(`- Started: ${session.startedAt}`);
  if (session.endedAt) {
    lines.push(`- Ended: ${session.endedAt}`);
  }
  if (session.intent) {
    lines.push(`- Intent: ${session.intent}`);
  }
  lines.push("");

  const d = session.dharmaCard;
  if (d) {
    lines.push("## Dharma Card");
    lines.push(`- Intent Clarity: ${d.intentClarity}`);
    lines.push(`- Context Provided: ${d.contextProvided}`);
    lines.push(`- Expected Validation: ${d.expectedValidation}`);
    lines.push(`- Risk Level: ${d.riskLevel}`, "");
  }

  if (session.karmaScore !== undefined) {
    lines.push("## Karma Score");
    lines.push(`- Score: ${session.karmaScore} (${session.karmaScoreLabel ?? ""})`);
    for (const reason of session.karmaReasons ?? []) {
      lines.push(`  - ${reason}`);
    }
    lines.push("");
  }

  const trace = buildKarmaTrace(sessionEvents);
  if (trace.length > 0) {
    lines.push("## Karma Trace");
    for (const t of trace) {
      lines.push(`- ${t}`);
    }
    lines.push("");
  }

  const p = session.phalCard;
  if (p) {
    lines.push("## Phal Card");
    lines.push(`- Outcome: ${p.outcome}`);
    lines.push(`- Files Changed: ${p.filesChanged} (${p.testFilesChanged} test)`);
    lines.push(`- Validation Detected: ${p.validationDetected ? "Yes" : "No"}`);
    if (p.recommendations.length > 0) {
      lines.push("- Recommendations:");
      for (const r of p.recommendations) {
        lines.push(`  - ${r}`);
      }
    }
    lines.push("");
  }

  const r = session.reflection;
  if (r && r.outcomeMatchedIntent) {
    lines.push("## Reflection (unscored)");
    lines.push(`- Outcome matched intent: ${r.outcomeMatchedIntent}`);
    lines.push("");
  }

  lines.push("---");
  lines.push("_Local-first. No source code captured. No cloud upload._");
  return lines.join("\n");
}
