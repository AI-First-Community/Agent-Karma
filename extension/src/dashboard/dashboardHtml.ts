import { AgentKarmaSession, AgentKarmaEvent } from "../core/types";

export interface DashboardData {
  nonce: string;
  cspSource: string;
  active: AgentKarmaSession | undefined;
  /** Events for the active session (used to show live file/validation capture). */
  activeEvents?: AgentKarmaEvent[];
  recent: AgentKarmaSession[];
}

/** Escape user-provided text before placing it in HTML. */
function esc(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function dharmaCardHtml(session: AgentKarmaSession): string {
  const d = session.dharmaCard;
  if (!d) {
    return "";
  }
  const hint =
    session.promptHintLabel !== undefined
      ? `<span class="hint" title="A soft prompt-hygiene hint — not a score">prompt hygiene: ${esc(session.promptHintLabel)}</span>`
      : "";
  return `
    <div class="dharma">
      <div class="dharma-head">🪔 Dharma Card ${hint}</div>
      <dl>
        <dt>Intent clarity</dt><dd>${esc(d.intentClarity)}</dd>
        <dt>Context provided</dt><dd>${esc(d.contextProvided)}</dd>
        <dt>Expected validation</dt><dd>${esc(d.expectedValidation)}</dd>
        <dt>Risk level</dt><dd>${esc(d.riskLevel)}</dd>
      </dl>
    </div>`;
}

function captureSummary(events: AgentKarmaEvent[]): string {
  const files = events.filter((e) => e.type === "file.saved");
  const testFiles = files.filter((e) => e.data.isTestFile === true).length;
  const validations = events
    .filter((e) => e.type === "validation.command")
    .map((e) => `${esc(String(e.data.commandType))} (${esc(String(e.data.result))})`);

  const filesLine = `${files.length} file${files.length === 1 ? "" : "s"}${
    testFiles > 0 ? ` (${testFiles} test)` : ""
  }`;
  const validationLine =
    validations.length > 0
      ? validations.join(", ")
      : `<span class="muted">none logged yet</span>`;

  return `
    <dl>
      <dt>Files changed</dt><dd>${filesLine}</dd>
      <dt>Validation</dt><dd>${validationLine}</dd>
    </dl>`;
}

function activeSection(
  active: AgentKarmaSession | undefined,
  events: AgentKarmaEvent[]
): string {
  if (!active) {
    return `<p class="muted">No active session. Click <b>▶ Agent Karma: Start</b> in the status bar to begin.</p>`;
  }
  return `
    <div class="card recording">
      <div class="badge">● Recording</div>
      <h3>${esc(active.title)}</h3>
      <dl>
        <dt>AI tool</dt><dd>${esc(active.aiTool)}</dd>
        <dt>Task type</dt><dd>${esc(active.taskType)}</dd>
        <dt>Started</dt><dd>${esc(active.startedAt)}</dd>
        <dt>Intent</dt><dd>${esc(active.intent) || "<span class='muted'>—</span>"}</dd>
      </dl>
      ${captureSummary(events)}
      ${dharmaCardHtml(active)}
    </div>`;
}

function recentSection(recent: AgentKarmaSession[]): string {
  if (recent.length === 0) {
    return `<p class="muted">No completed sessions yet.</p>`;
  }
  const rows = recent
    .map(
      (s) => `
      <tr>
        <td>${esc(s.title)}</td>
        <td>${esc(s.aiTool)}</td>
        <td>${esc(s.taskType)}</td>
        <td>${esc(s.dharmaCard?.riskLevel ?? "")}</td>
        <td>${esc(s.endedAt ?? "")}</td>
      </tr>`
    )
    .join("");
  return `
    <table>
      <thead><tr><th>Session</th><th>AI tool</th><th>Task</th><th>Risk</th><th>Ended</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

/** Render the read-only dashboard. Strict CSP: no scripts, no remote anything. */
export function renderDashboardHtml(data: DashboardData): string {
  const csp = [
    `default-src 'none'`,
    `style-src '${data.cspSource}' 'nonce-${data.nonce}'`,
    `img-src '${data.cspSource}'`,
  ].join("; ");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="${csp}" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style nonce="${data.nonce}">
    body { font-family: var(--vscode-font-family); color: var(--vscode-foreground); padding: 1rem 1.5rem; }
    h1 { font-size: 1.3rem; margin-bottom: 0; }
    .tagline { color: var(--vscode-descriptionForeground); margin-top: 0.25rem; }
    h2 { font-size: 1rem; margin-top: 1.75rem; border-bottom: 1px solid var(--vscode-panel-border); padding-bottom: 0.25rem; }
    .muted { color: var(--vscode-descriptionForeground); }
    .card { border: 1px solid var(--vscode-panel-border); border-radius: 6px; padding: 0.75rem 1rem; }
    .card.recording { border-color: var(--vscode-charts-red, #e51400); }
    .badge { color: var(--vscode-charts-red, #e51400); font-weight: 600; font-size: 0.8rem; }
    dl { display: grid; grid-template-columns: max-content 1fr; gap: 0.15rem 1rem; margin: 0.5rem 0 0; }
    dt { color: var(--vscode-descriptionForeground); }
    table { border-collapse: collapse; width: 100%; font-size: 0.9rem; }
    th, td { text-align: left; padding: 0.35rem 0.5rem; border-bottom: 1px solid var(--vscode-panel-border); }
    th { color: var(--vscode-descriptionForeground); font-weight: 600; }
    .dharma { margin-top: 0.75rem; padding-top: 0.6rem; border-top: 1px dashed var(--vscode-panel-border); }
    .dharma-head { font-weight: 600; font-size: 0.85rem; margin-bottom: 0.25rem; }
    .hint { font-weight: 400; font-size: 0.8rem; color: var(--vscode-descriptionForeground); font-style: italic; margin-left: 0.5rem; }
    footer { margin-top: 2rem; color: var(--vscode-descriptionForeground); font-size: 0.8rem; }
  </style>
  <title>Agent Karma</title>
</head>
<body>
  <h1>Agent Karma</h1>
  <p class="tagline">Make every agent action count.</p>

  <h2>Active session</h2>
  ${activeSection(data.active, data.activeEvents ?? [])}

  <h2>Recent sessions</h2>
  ${recentSection(data.recent)}

  <footer>Local-first. No source code captured. No cloud upload.</footer>
</body>
</html>`;
}
