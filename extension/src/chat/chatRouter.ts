import { ValidationCommandType } from "../core/types";

// Pure routing + formatting for the @agentkarma chat participant. The participant is
// a low-friction capture + coach surface; crucially, /verify is the one mechanism that
// covers AI used in a browser or copy-pasted in — work that leaves no IDE/log trail for
// a parser to find. This module has no vscode dependency so it is fully unit-testable;
// the thin participant wires it to the live services.

export type ChatIntent =
  | { kind: "verify"; commandType: ValidationCommandType; result: "passed" | "failed" }
  | { kind: "summary" }
  | { kind: "help" };

const TYPE_KEYWORDS: [RegExp, ValidationCommandType][] = [
  [/\b(unit ?tests?|tests?|spec|specs|vitest|jest|pytest|mocha)\b/, "Test"],
  [/\b(lint|eslint|ruff|flake8|biome|pylint)\b/, "Lint"],
  [/\b(type ?checks?|typecheck|types?|tsc)\b/, "Type Check"],
  [/\b(builds?|compiles?|compilation)\b/, "Build"],
  [/\b(security|audit|vuln(?:erabilit(?:y|ies))?)\b/, "Security"],
];

function detectType(p: string): ValidationCommandType | undefined {
  for (const [re, type] of TYPE_KEYWORDS) {
    if (re.test(p)) {
      return type;
    }
  }
  return undefined;
}

function detectResult(p: string): "passed" | "failed" {
  return /\b(fail|failed|failing|broke|broken|red|errors?)\b/.test(p) ? "failed" : "passed";
}

/**
 * Parse a chat turn into an intent. `command` is the slash command name (no slash),
 * `prompt` is the free text after it (either may be empty).
 */
export function parseChatCommand(command: string, prompt: string): ChatIntent {
  const cmd = command.trim().toLowerCase();
  const p = prompt.toLowerCase();

  if (cmd === "summary") {
    return { kind: "summary" };
  }

  const type = detectType(p);
  const looksLikeVerify =
    cmd === "verify" || !!type || /\bverif|\bi (?:ran|tested|checked)\b|\bran\b/.test(p);
  if (looksLikeVerify) {
    return type ? { kind: "verify", commandType: type, result: detectResult(p) } : { kind: "help" };
  }

  if (/\bsummar|\bscore|\bkarma|how am i\b/.test(p)) {
    return { kind: "summary" };
  }
  return { kind: "help" };
}

export interface SummaryData {
  lastTitle?: string;
  lastScore?: number;
  lastLabel?: string;
  lastReasons?: string[];
  reflectionNudge?: string;
  readinessSummary?: string;
  readinessTopGap?: string;
}

export function formatSummary(d: SummaryData): string {
  if (d.lastScore === undefined) {
    return [
      "**Agent Karma**",
      "",
      "No scored sessions yet. Start a session, validate the AI's work, and I'll reflect it back here.",
      "",
      "Tip: `@agentkarma /verify ran tests, all green` logs a validation — even for AI you used in a browser.",
    ].join("\n");
  }
  const lines = [
    "**Agent Karma — your latest**",
    "",
    `- **Last session:** ${d.lastTitle ?? "(untitled)"} — Karma **${d.lastScore}** (${d.lastLabel ?? ""})`,
  ];
  if (d.lastReasons && d.lastReasons.length) {
    lines.push(`  - earned: ${d.lastReasons.join("; ")}`);
  }
  if (d.reflectionNudge) {
    lines.push(`- **This week:** ${d.reflectionNudge}`);
  }
  if (d.readinessSummary) {
    const gap = d.readinessTopGap ? ` _(biggest gap: ${d.readinessTopGap})_` : "";
    lines.push(`- **Can you validate?** ${d.readinessSummary}${gap}`);
  }
  return lines.join("\n");
}

export function formatVerify(
  commandType: ValidationCommandType,
  result: "passed" | "failed",
  ok: boolean,
  sessionTitle?: string
): string {
  if (!ok) {
    return "I couldn't log that — there's no active session and I couldn't start one. Open a workspace folder and try again.";
  }
  const where = sessionTitle ? ` to **${sessionTitle}**` : "";
  return [
    `✓ Logged a **${commandType}** validation (${result})${where}.`,
    "",
    "_Self-reported via chat, so it counts as logged — not observed. Run **/summary** to see your Karma._",
  ].join("\n");
}

export function helpText(): string {
  return [
    "**@agentkarma** — your validation companion, in chat.",
    "",
    "- **/verify** _tests · build · lint · types_ — log that you validated the AI's work (covers browser & copy-paste AI that nothing else can see)",
    "- **/summary** — your latest Karma, this week's nudge, and whether you can even validate",
    "",
    "Example: `@agentkarma /verify ran the tests, all passing`",
  ].join("\n");
}
