import { AgentKarmaSession, AgentKarmaEvent } from "../core/types";
import { buildKarmaTrace } from "../cards/karmaTrace";
import { DashboardStats, BreakdownRow } from "./dashboardStats";
import { sparkline, percentBar, outcomeBar } from "./charts";
import { WeeklyReflection } from "../reflection/weeklyReflection";

export interface DashboardData {
  nonce: string;
  cspSource: string;
  stats?: DashboardStats;
  reflection?: WeeklyReflection;
  byTool?: BreakdownRow[];
  byTask?: BreakdownRow[];
  active: AgentKarmaSession | undefined;
  /** Events for the active session (used to show live file/validation capture). */
  activeEvents?: AgentKarmaEvent[];
  /** Most recent completed session (shows its Phal card + trace). */
  lastCompleted?: AgentKarmaSession;
  lastCompletedEvents?: AgentKarmaEvent[];
  recent: AgentKarmaSession[];
}

const EMPTY_STATS: DashboardStats = {
  sessionCount: 0,
  recentCount: 0,
  testsRunCount: 0,
  scoreSeries: [],
  outcomes: { ready: 0, needs: 0, highRisk: 0, informational: 0 },
};

function trendArrow(t: "up" | "down" | "flat" | undefined): string {
  return t === "up" ? "↑" : t === "down" ? "↓" : "→";
}

/** The "This week" coaching card — one plain-language nudge from your own history. */
function reflectionCard(r: WeeklyReflection | undefined): string {
  if (!r) {
    return "";
  }
  const tone =
    r.tone === "encourage" ? "refl-good" : r.tone === "suggest" ? "refl-suggest" : "refl-neutral";
  return `
    <div class="reflection ${tone}">
      <div class="refl-head">🌱 This week</div>
      <div class="refl-summary">${esc(r.summary)}</div>
      <div class="refl-nudge">${esc(r.nudge)}</div>
    </div>`;
}

/** Hero header + "at a glance" panel — our unique signals, visualized. */
function glanceSection(stats: DashboardStats): string {
  if (stats.rollingKarma === undefined) {
    return `<div class="hero"><div class="hero-karma muted">No sessions yet</div><div class="tagline">Start a session to begin building your Karma.</div></div>`;
  }
  return `
    <div class="hero">
      <div class="hero-karma">Karma <b>${stats.rollingKarma}</b> <span class="trend">${trendArrow(
        stats.lastTrend
      )}</span></div>
      <div class="tagline">${stats.sessionCount} session${stats.sessionCount === 1 ? "" : "s"} · self-comparative (vs. your own average)</div>
    </div>
    <div class="glance">
      <div class="g-item">
        <div class="g-label">Validation rate</div>
        <div class="g-value">${percentBar(stats.validationRate ?? 0)} ${stats.validationRate ?? 0}%</div>
      </div>
      <div class="g-item">
        <div class="g-label">Tests run</div>
        <div class="g-value">${stats.testsRunCount} / ${stats.recentCount}</div>
      </div>
      <div class="g-item">
        <div class="g-label">Karma trend</div>
        <div class="g-value spark-wrap">${sparkline(stats.scoreSeries)}</div>
      </div>
      <div class="g-item g-wide">
        <div class="g-label">Outcomes (recent)</div>
        <div class="g-value">${outcomeBar(stats.outcomes)}</div>
      </div>
    </div>`;
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

function scoreBlock(session: AgentKarmaSession): string {
  if (session.karmaScore === undefined) {
    return "";
  }
  const arrow =
    session.karmaTrend === "up" ? "↑" : session.karmaTrend === "down" ? "↓" : "→";
  const checklist =
    (session.karmaReasons ?? []).length > 0
      ? (session.karmaReasons ?? []).map((r) => `<li>✔ ${esc(r)}</li>`).join("")
      : `<li class="muted">no validation actions recorded</li>`;
  return `
    <div class="dharma-head" style="margin-top:0.75rem;">⚖️ Karma Score</div>
    <ul class="checklist">${checklist}</ul>
    <div class="scoreline">Karma <b>${session.karmaScore}</b> · ${esc(
      session.karmaScoreLabel ?? ""
    )} <span class="trend">${arrow} vs your average</span></div>`;
}

function lastSessionSection(
  session: AgentKarmaSession | undefined,
  events: AgentKarmaEvent[]
): string {
  if (!session || !session.phalCard) {
    return `<p class="muted">No completed session yet.</p>`;
  }
  const p = session.phalCard;
  const git = session.gitDiffSummary;
  const gitLine =
    git && git.captured
      ? `${git.filesChanged} files, +${git.linesAdded} / -${git.linesDeleted}`
      : `<span class="muted">not captured</span>`;
  const validation = p.validationDetected
    ? p.commandsDetected.map((c) => esc(`${c.type} (${c.result})`)).join(", ")
    : `<span class="muted">none</span>`;
  const recs = p.recommendations.length
    ? `<ul>${p.recommendations.map((r) => `<li>${esc(r)}</li>`).join("")}</ul>`
    : `<span class="muted">none</span>`;
  const trace = buildKarmaTrace(events);
  const traceHtml = trace.length
    ? `<pre class="trace">${trace.map(esc).join("\n")}</pre>`
    : "";

  return `
    <div class="card">
      <div class="outcome outcome-${esc(p.outcome.replace(/\s+/g, "-").toLowerCase())}">🍃 ${esc(p.outcome)}</div>
      <h3>${esc(session.title)}</h3>
      ${scoreBlock(session)}
      <dl>
        <dt>Files changed</dt><dd>${p.filesChanged} (${p.testFilesChanged} test)</dd>
        <dt>Validation</dt><dd>${validation}</dd>
        <dt>Git diff</dt><dd>${gitLine}</dd>
      </dl>
      <div class="recs"><b>Recommendations</b>${recs}</div>
      <div class="dharma-head" style="margin-top:0.75rem;">Karma Trace</div>
      ${traceHtml}
    </div>`;
}

function breakdownTable(label: string, rows: BreakdownRow[]): string {
  if (rows.length === 0) {
    return "";
  }
  const body = rows
    .map(
      (r) => `
      <tr>
        <td>${esc(r.key)}</td>
        <td>${r.sessions}</td>
        <td>${percentBar(r.validationRate)} ${r.validationRate}%</td>
        <td>${r.avgKarma ?? "—"}</td>
      </tr>`
    )
    .join("");
  return `
    <h3 class="bd-title">${esc(label)}</h3>
    <table>
      <thead><tr><th>${esc(label === "By AI tool" ? "AI tool" : "Task type")}</th><th>Sessions</th><th>Validation rate</th><th>Avg Karma</th></tr></thead>
      <tbody>${body}</tbody>
    </table>`;
}

function patternsSection(byTool: BreakdownRow[], byTask: BreakdownRow[]): string {
  if (byTool.length === 0 && byTask.length === 0) {
    return "";
  }
  return `
    <h2>Patterns</h2>
    <p class="muted">How consistently you validate, broken down — your own insight, never a usage count.</p>
    ${breakdownTable("By AI tool", byTool)}
    ${breakdownTable("By task type", byTask)}`;
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
        <td>${s.karmaScore !== undefined ? `${s.karmaScore} · ${esc(s.karmaScoreLabel ?? "")}` : ""}</td>
        <td>${esc(s.dharmaCard?.riskLevel ?? "")}</td>
      </tr>`
    )
    .join("");
  return `
    <table>
      <thead><tr><th>Session</th><th>AI tool</th><th>Task</th><th>Karma</th><th>Risk</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

/** Render the read-only dashboard. Strict CSP: no scripts, no remote anything. */
export function renderDashboardHtml(data: DashboardData): string {
  const csp = [
    `default-src 'none'`,
    // 'unsafe-inline' covers dynamic style attributes (chart widths); no scripts allowed.
    `style-src '${data.cspSource}' 'nonce-${data.nonce}' 'unsafe-inline'`,
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
    .outcome { display: inline-block; font-weight: 600; font-size: 0.8rem; padding: 0.1rem 0.5rem; border-radius: 4px; margin-bottom: 0.25rem; }
    .outcome-ready-for-review { color: var(--vscode-charts-green, #388a34); }
    .outcome-needs-review { color: var(--vscode-charts-yellow, #b89500); }
    .outcome-high-risk { color: var(--vscode-charts-red, #e51400); }
    .outcome-informational { color: var(--vscode-descriptionForeground); }
    .recs ul { margin: 0.25rem 0 0; padding-left: 1.1rem; }
    .trace { background: var(--vscode-textCodeBlock-background); padding: 0.5rem 0.75rem; border-radius: 4px; font-size: 0.82rem; white-space: pre-wrap; overflow-x: auto; }
    .checklist { list-style: none; margin: 0.25rem 0 0; padding-left: 0; }
    .checklist li { font-size: 0.88rem; padding: 0.1rem 0; }
    .scoreline { margin-top: 0.4rem; font-size: 0.95rem; }
    .scoreline b { font-size: 1.15rem; }
    .trend { color: var(--vscode-descriptionForeground); font-size: 0.82rem; margin-left: 0.5rem; }
    /* hero + at-a-glance */
    .hero { margin: 1rem 0 0.5rem; }
    .hero-karma { font-size: 1.05rem; }
    .hero-karma b { font-size: 1.9rem; }
    .glance { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem 1rem; margin: 0.5rem 0 0.5rem; }
    .g-item { border: 1px solid var(--vscode-panel-border); border-radius: 6px; padding: 0.55rem 0.7rem; }
    .g-wide { grid-column: 1 / -1; }
    .g-label { color: var(--vscode-descriptionForeground); font-size: 0.78rem; margin-bottom: 0.3rem; }
    .g-value { font-size: 0.95rem; display: flex; align-items: center; gap: 0.5rem; }
    .spark { color: var(--vscode-charts-blue, #3794ff); display: block; }
    .bar { display: inline-block; width: 90px; height: 8px; border-radius: 4px; background: var(--vscode-panel-border); overflow: hidden; vertical-align: middle; }
    .bar-fill { display: block; height: 100%; background: var(--vscode-charts-green, #388a34); }
    .stack { display: flex; width: 100%; height: 12px; border-radius: 4px; overflow: hidden; background: var(--vscode-panel-border); }
    .seg { display: block; height: 100%; }
    .seg-ready { background: var(--vscode-charts-green, #388a34); }
    .seg-needs { background: var(--vscode-charts-yellow, #b89500); }
    .seg-high { background: var(--vscode-charts-red, #e51400); }
    .seg-info { background: var(--vscode-descriptionForeground); }
    /* weekly reflection */
    .reflection { border-left: 3px solid var(--vscode-panel-border); padding: 0.6rem 0.9rem; margin: 0.75rem 0; border-radius: 0 6px 6px 0; background: var(--vscode-textBlockQuote-background, transparent); }
    .refl-good { border-left-color: var(--vscode-charts-green, #388a34); }
    .refl-suggest { border-left-color: var(--vscode-charts-yellow, #b89500); }
    .refl-neutral { border-left-color: var(--vscode-descriptionForeground); }
    .refl-head { font-weight: 600; font-size: 0.85rem; }
    .refl-summary { color: var(--vscode-descriptionForeground); font-size: 0.82rem; margin: 0.15rem 0; }
    .refl-nudge { font-size: 0.95rem; }
    .bd-title { font-size: 0.9rem; margin: 0.9rem 0 0.3rem; }
    footer { margin-top: 2rem; color: var(--vscode-descriptionForeground); font-size: 0.8rem; }
  </style>
  <title>Agent Karma</title>
</head>
<body>
  <h1>Agent Karma</h1>
  <p class="tagline">Make every agent action count.</p>

  ${glanceSection(data.stats ?? EMPTY_STATS)}

  ${reflectionCard(data.reflection)}

  <h2>Active session</h2>
  ${activeSection(data.active, data.activeEvents ?? [])}

  <h2>Last session</h2>
  ${lastSessionSection(data.lastCompleted, data.lastCompletedEvents ?? [])}

  ${patternsSection(data.byTool ?? [], data.byTask ?? [])}

  <h2>Recent sessions</h2>
  ${recentSection(data.recent)}

  <footer>Local-first. No source code captured. No cloud upload.</footer>
</body>
</html>`;
}
