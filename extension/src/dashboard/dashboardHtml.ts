import { AgentKarmaSession, AgentKarmaEvent } from "../core/types";
import { buildKarmaTrace } from "../cards/karmaTrace";
import { DashboardStats, ValidationHabits } from "./dashboardStats";
import { sparkline, percentBar, outcomeBar, gauge } from "./charts";
import { WeeklyReflection } from "../reflection/weeklyReflection";
import { riskAlignment } from "../cards/riskAlignment";
import { ValidationReadiness } from "../collectors/validationReadiness";
import { KARMA_RULES } from "../scoring/karmaRules";
import { KarmaMove, earnedRuleIds } from "../scoring/karmaExplain";

export interface DashboardData {
  nonce: string;
  cspSource: string;
  /** Webview URI of the bundled Manrope woff2 (omitted in the browser preview). */
  fontUri?: string;
  stats?: DashboardStats;
  reflection?: WeeklyReflection;
  validationHabits?: ValidationHabits;
  /** Workspace "can you even validate?" scan (config-only). Omitted with no folder open. */
  readiness?: ValidationReadiness;
  active: AgentKarmaSession | undefined;
  /** Events for the active session (used to show live file/validation capture). */
  activeEvents?: AgentKarmaEvent[];
  /** Most recent completed session (shows its Phal card + trace). */
  lastCompleted?: AgentKarmaSession;
  lastCompletedEvents?: AgentKarmaEvent[];
  /** Explanation of the Karma change from the prior completed session, if any. */
  karmaMove?: KarmaMove;
  recent: AgentKarmaSession[];
}

const EMPTY_STATS: DashboardStats = {
  sessionCount: 0,
  recentCount: 0,
  testsRunCount: 0,
  scoreSeries: [],
  outcomes: { ready: 0, needs: 0, highRisk: 0, informational: 0 },
};

/** Validation Habits — where you're strong and where you have gaps. */
function habitsSection(h: ValidationHabits | undefined): string {
  if (!h || h.recentCount === 0) {
    return "";
  }
  const rows = h.rates
    .map(
      (r) => `
      <div class="habit">
        <span class="habit-label">${esc(r.type)}</span>
        ${percentBar(r.rate)}
        <span class="habit-pct">${r.rate}%</span>
      </div>`
    )
    .join("");
  const insight =
    h.strongest && h.weakest && h.strongest.type !== h.weakest.type
      ? `<div class="habit-insight">Strongest: <b>${esc(h.strongest.type)}</b> ${h.strongest.rate}% · biggest gap: <b>${esc(h.weakest.type)}</b> ${h.weakest.rate}%</div>`
      : "";
  return `
    <h2>Validation habits</h2>
    <p class="muted">How often you run each check (last ${h.recentCount} sessions).</p>
    <div class="habits">${rows}</div>
    ${insight}`;
}

/** "Can you even validate?" — the workspace's means to verify AI output. */
function readinessSection(r: ValidationReadiness | undefined): string {
  if (!r) {
    return "";
  }
  const rows = r.checks
    .map(
      (c) => `
      <div class="ready-row">
        <span class="ready-mark ${c.present ? "ready-yes" : "ready-no"}">${c.present ? "✔" : "○"}</span>
        <span class="ready-label">${esc(c.label)}</span>
        <span class="ready-detail muted">${esc(c.detail)}</span>
      </div>`
    )
    .join("");
  const gap = r.topGap
    ? `<div class="ready-gap">Biggest gap: <b>${esc(r.topGap.label)}</b> — ${esc(r.topGap.detail)}.</div>`
    : "";
  return `
    <h2>Can you validate?</h2>
    <p class="muted">${esc(r.summary)} <span class="ready-score">${r.presentCount}/${r.total}</span></p>
    <div class="ready">${rows}</div>
    ${gap}`;
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

/**
 * "At a glance" — validation discipline first; the Karma number stays quiet.
 * The big gauge only appears once there are enough sessions (~5) for a
 * self-comparative trend to mean anything (scoring-model §3.4). Below that the
 * number is a muted "forming" note so the dashboard never grades a sparse history.
 */
function glanceSection(stats: DashboardStats): string {
  if (stats.rollingKarma === undefined) {
    return `<div class="hero hero-empty">
      <div class="hero-meta">
        <div class="hero-label muted">No sessions yet</div>
        <div class="hero-sub">Start a session — Agent Karma reflects back whether you validated the AI's work.</div>
      </div>
    </div>`;
  }
  const forming = stats.sessionCount < 5;
  const numberBlock = forming
    ? `<div class="hero-meta">
         <div class="karma-quiet muted">Karma forming · ${stats.sessionCount}/5 session${stats.sessionCount === 1 ? "" : "s"}</div>
         <div class="hero-sub">The trend becomes meaningful after a few sessions. Focus on the checklist above.</div>
       </div>`
    : `<div class="gauge-wrap">${gauge(stats.rollingKarma)}</div>
       <div class="hero-meta">
         <div class="hero-label">Karma</div>
         <div class="hero-sub">${stats.sessionCount} sessions · self-comparative (vs. your own average)</div>
       </div>`;
  return `
    <div class="hero">${numberBlock}</div>
    <div class="glance">
      <div class="g-item">
        <div class="g-label">Validation rate</div>
        <div class="g-value">${percentBar(stats.validationRate ?? 0)} <b>${stats.validationRate ?? 0}%</b></div>
      </div>
      <div class="g-item">
        <div class="g-label">Tests run</div>
        <div class="g-value"><b>${stats.testsRunCount}</b> <span class="muted">/ ${stats.recentCount}</span></div>
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

  const risk = riskAlignment(session);
  const riskBadge = risk.label
    ? `<div class="risk-flag ${risk.warn ? "risk-warn" : "risk-ok"}">${risk.warn ? "⚠" : "✓"} ${esc(risk.label)}</div>`
    : "";

  return `
    <div class="card">
      <div class="outcome outcome-${esc(p.outcome.replace(/\s+/g, "-").toLowerCase())}">🍃 ${esc(p.outcome)}</div>
      <h3>${esc(session.title)}</h3>
      ${riskBadge}
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

/** "Why did my Karma move?" — the delta from the prior session, in named rules. */
function karmaMoveCard(move: KarmaMove | undefined): string {
  if (!move || (move.gained.length === 0 && move.lost.length === 0 && move.delta === 0)) {
    return "";
  }
  const dir = move.delta > 0 ? "move-up" : move.delta < 0 ? "move-down" : "move-flat";
  const arrow = move.delta > 0 ? "↑" : move.delta < 0 ? "↓" : "→";
  return `
    <div class="karma-move ${dir}">
      <div class="move-head">${arrow} Why did my Karma move?</div>
      <div class="move-summary">${esc(move.summary)}</div>
    </div>`;
}

/** Karma rules reference — every rule, its weight, and whether the last session earned it. */
function karmaRulesSection(last: AgentKarmaSession | undefined): string {
  const earned = last ? earnedRuleIds({ karmaReasons: last.karmaReasons }) : new Set<string>();
  const rows = KARMA_RULES.map((r) => {
    const got = earned.has(r.id);
    return `
      <div class="rule-row">
        <span class="rule-mark ${got ? "rule-yes" : "rule-no"}">${got ? "✔" : "○"}</span>
        <span class="rule-label">${esc(r.label)}</span>
        <span class="rule-weight">${r.maxPoints}</span>
        <span class="rule-desc muted">${esc(r.description)}</span>
      </div>`;
  }).join("");
  const lead = last
    ? "Every point your last session earned, traced to a rule (✔ = earned)."
    : "The full, transparent rule table — every point of Karma traces to one of these.";
  return `
    <h2>Karma rules</h2>
    <p class="muted">${lead} Validation rules sum to 90; the prompt-hygiene hint is capped at 10.</p>
    <div class="rules">
      <div class="rule-row rule-headrow">
        <span></span><span class="rule-label">Rule</span><span class="rule-weight">Pts</span><span class="rule-desc">What it rewards</span>
      </div>
      ${rows}
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
    `font-src '${data.cspSource}'`,
  ].join("; ");

  const fontFace = data.fontUri
    ? `@font-face{font-family:'Manrope';font-style:normal;font-weight:200 800;font-display:swap;src:url(${data.fontUri}) format('woff2');}`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="${csp}" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style nonce="${data.nonce}">
    ${fontFace}
    body { font-family: 'Manrope', var(--vscode-font-family), -apple-system, 'Segoe UI', sans-serif; -webkit-font-smoothing: antialiased; color: var(--vscode-foreground); padding: 1.5rem 1.9rem; max-width: 780px; line-height: 1.5; }
    h1 { font-size: 1.5rem; font-weight: 800; margin: 0; letter-spacing: -0.02em; }
    .tagline { color: var(--vscode-descriptionForeground); margin-top: 0.2rem; font-size: 0.9rem; }
    h2 { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--vscode-descriptionForeground); margin: 2rem 0 0.7rem; padding-bottom: 0; border: 0; }
    h3 { font-size: 1.1rem; font-weight: 700; margin: 0.2rem 0 0.5rem; letter-spacing: -0.01em; }
    .muted { color: var(--vscode-descriptionForeground); }
    .card { border: 1px solid var(--vscode-panel-border); border-radius: 12px; padding: 1rem 1.2rem; background: var(--vscode-textBlockQuote-background, transparent); }
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
    .outcome { display: inline-block; font-weight: 700; font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.04em; padding: 0.2rem 0.6rem; border-radius: 999px; margin-bottom: 0.4rem; }
    .outcome-ready-for-review { color: var(--vscode-charts-green, #388a34); background: color-mix(in srgb, var(--vscode-charts-green, #388a34) 16%, transparent); }
    .outcome-needs-review { color: var(--vscode-charts-yellow, #b89500); background: color-mix(in srgb, var(--vscode-charts-yellow, #b89500) 16%, transparent); }
    .outcome-high-risk { color: var(--vscode-charts-red, #e51400); background: color-mix(in srgb, var(--vscode-charts-red, #e51400) 16%, transparent); }
    .outcome-informational { color: var(--vscode-descriptionForeground); background: color-mix(in srgb, var(--vscode-descriptionForeground) 14%, transparent); }
    .recs ul { margin: 0.25rem 0 0; padding-left: 1.1rem; }
    .trace { background: var(--vscode-textCodeBlock-background); padding: 0.5rem 0.75rem; border-radius: 4px; font-size: 0.82rem; white-space: pre-wrap; overflow-x: auto; }
    .checklist { list-style: none; margin: 0.25rem 0 0; padding-left: 0; }
    .checklist li { font-size: 0.88rem; padding: 0.1rem 0; }
    .scoreline { margin-top: 0.4rem; font-size: 0.95rem; }
    .scoreline b { font-size: 1.15rem; }
    .trend { color: var(--vscode-descriptionForeground); font-size: 0.82rem; margin-left: 0.5rem; }
    /* hero + at-a-glance */
    .hero { display: flex; align-items: center; gap: 1.1rem; margin: 1.25rem 0 1rem; }
    .gauge-wrap { flex: 0 0 auto; }
    .gauge-num { fill: var(--vscode-foreground); font-size: 1.55rem; font-weight: 700; }
    .hero-meta { display: flex; flex-direction: column; gap: 0.15rem; }
    .hero-label { font-size: 1.35rem; font-weight: 600; }
    .hero-sub { color: var(--vscode-descriptionForeground); font-size: 0.85rem; }
    .hero-empty .gauge-num { fill: var(--vscode-descriptionForeground); }
    .karma-quiet { font-size: 0.98rem; font-weight: 700; letter-spacing: -0.01em; }
    .glance { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.8rem; margin: 0 0 1.25rem; }
    .g-item { border: 1px solid var(--vscode-panel-border); border-radius: 8px; padding: 0.7rem 0.85rem; background: var(--vscode-textBlockQuote-background, transparent); }
    .g-wide { grid-column: 1 / -1; }
    .g-label { color: var(--vscode-descriptionForeground); font-size: 0.74rem; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 0.4rem; }
    .g-value { font-size: 1rem; display: flex; align-items: center; gap: 0.5rem; }
    .g-value b { font-size: 1.1rem; }
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
    .habits { display: flex; flex-direction: column; gap: 0.45rem; }
    .habit { display: flex; align-items: center; gap: 0.7rem; }
    .habit-label { flex: 0 0 5.5rem; font-size: 0.88rem; }
    .habit .bar { flex: 1; width: auto; }
    .habit-pct { flex: 0 0 2.6rem; text-align: right; font-size: 0.85rem; font-weight: 600; }
    .habit-insight { margin-top: 0.5rem; font-size: 0.88rem; color: var(--vscode-descriptionForeground); }
    /* validation context health */
    .ready { display: flex; flex-direction: column; gap: 0.3rem; }
    .ready-row { display: grid; grid-template-columns: 1.2rem 9rem 1fr; align-items: baseline; gap: 0.5rem; font-size: 0.88rem; }
    .ready-mark { font-weight: 700; text-align: center; }
    .ready-yes { color: var(--vscode-charts-green, #388a34); }
    .ready-no { color: var(--vscode-descriptionForeground); }
    .ready-label { font-weight: 600; }
    .ready-detail { font-size: 0.84rem; }
    .ready-score { font-weight: 700; color: var(--vscode-foreground); }
    .ready-gap { margin-top: 0.5rem; font-size: 0.88rem; padding: 0.5rem 0.7rem; border-radius: 8px; background: color-mix(in srgb, var(--vscode-charts-yellow, #b89500) 12%, transparent); }
    /* why did my Karma move */
    .karma-move { margin: 0.6rem 0 0; padding: 0.55rem 0.85rem; border-radius: 8px; border-left: 3px solid var(--vscode-descriptionForeground); background: var(--vscode-textBlockQuote-background, transparent); }
    .karma-move.move-up { border-left-color: var(--vscode-charts-green, #388a34); }
    .karma-move.move-down { border-left-color: var(--vscode-charts-red, #e51400); }
    .move-head { font-weight: 700; font-size: 0.85rem; }
    .move-summary { font-size: 0.9rem; margin-top: 0.15rem; }
    /* karma rules reference */
    .rules { display: flex; flex-direction: column; gap: 0.25rem; }
    .rule-row { display: grid; grid-template-columns: 1.2rem 12rem 2rem 1fr; align-items: baseline; gap: 0.5rem; font-size: 0.86rem; }
    .rule-headrow { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--vscode-descriptionForeground); border-bottom: 1px solid var(--vscode-panel-border); padding-bottom: 0.2rem; }
    .rule-mark { font-weight: 700; text-align: center; }
    .rule-yes { color: var(--vscode-charts-green, #388a34); }
    .rule-no { color: var(--vscode-descriptionForeground); }
    .rule-label { font-weight: 600; }
    .rule-weight { text-align: right; font-variant-numeric: tabular-nums; color: var(--vscode-descriptionForeground); }
    .rule-desc { font-size: 0.82rem; }
    .risk-flag { display: inline-block; font-size: 0.82rem; font-weight: 600; padding: 0.25rem 0.65rem; border-radius: 999px; margin: 0.1rem 0 0.5rem; }
    .risk-warn { color: var(--vscode-charts-red, #e51400); background: color-mix(in srgb, var(--vscode-charts-red, #e51400) 16%, transparent); }
    .risk-ok { color: var(--vscode-charts-green, #388a34); background: color-mix(in srgb, var(--vscode-charts-green, #388a34) 14%, transparent); }
    footer { margin-top: 2rem; color: var(--vscode-descriptionForeground); font-size: 0.8rem; }
  </style>
  <title>Agent Karma</title>
</head>
<body>
  <h1>Agent Karma</h1>
  <p class="tagline">Did you validate what the AI produced — before you trusted it?</p>

  <h2>Active session</h2>
  ${activeSection(data.active, data.activeEvents ?? [])}

  <h2>Last session</h2>
  ${lastSessionSection(data.lastCompleted, data.lastCompletedEvents ?? [])}
  ${karmaMoveCard(data.karmaMove)}

  ${reflectionCard(data.reflection)}

  ${readinessSection(data.readiness)}

  ${habitsSection(data.validationHabits)}

  <h2>At a glance</h2>
  ${glanceSection(data.stats ?? EMPTY_STATS)}

  ${karmaRulesSection(data.lastCompleted)}

  <h2>Recent sessions</h2>
  ${recentSection(data.recent)}

  <footer>Local-first. No source code captured. No cloud upload.</footer>
</body>
</html>`;
}
