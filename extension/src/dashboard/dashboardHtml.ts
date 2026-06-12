import { AgentKarmaSession, AgentKarmaEvent } from "../core/types";
import { buildKarmaTrace } from "../cards/karmaTrace";
import { DashboardStats, ValidationHabits } from "./dashboardStats";
import { sparkline, percentBar, outcomeBar, gauge, validationStreak, trendLine, heatmap, HeatRow } from "./charts";
import { WeeklyReflection } from "../reflection/weeklyReflection";
import { riskAlignment } from "../cards/riskAlignment";
import { ValidationReadiness } from "../collectors/validationReadiness";
import { KARMA_RULES } from "../scoring/karmaRules";
import { KarmaMove, earnedRuleIds } from "../scoring/karmaExplain";
import { SkillSuggestion } from "../skills/skillFinder";
import { karmicMessage } from "./karmicMessage";
import { worstTaskCheck, WatchItem, ScoreComposition } from "./insights";

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
  /** Ranked, actionable next steps (habit gaps × missing infra). */
  suggestions?: SkillSuggestion[];
  /** Validation heatmap: task type (rows) × check (cols). */
  heatmap?: { rows: HeatRow[]; colLabels: string[] };
  /** High-risk sessions changed but never validated — a to-do list to revisit. */
  watchlist?: WatchItem[];
  /** How earned Karma splits between real verification and near-free points. */
  scoreComposition?: ScoreComposition;
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
  validationCells: [],
  consistency: { validatedCount: 0, total: 0, currentRun: 0, bestRun: 0 },
  riskValidation: [],
};

/** Validation Habits — where you're strong and where you have gaps. */
function habitsSection(h: ValidationHabits | undefined): string {
  if (!h || h.recentCount === 0) {
    return "";
  }
  const arrow = (t: string): string => (t === "rising" ? "↑" : t === "slipping" ? "↓" : "→");
  const rows = h.rates
    .map(
      (r) => `
      <div class="habit">
        <span class="habit-label">${esc(r.type)}</span>
        ${percentBar(r.rate)}
        <span class="habit-pct">${r.rate}%</span>
        <span class="habit-trend ht-${esc(r.trend)}">${arrow(r.trend)} ${esc(r.trend)}</span>
      </div>`
    )
    .join("");
  const insight =
    h.strongest && h.weakest && h.strongest.type !== h.weakest.type
      ? `<div class="habit-insight">Strongest: <b>${esc(h.strongest.type)}</b> ${h.strongest.rate}% · biggest gap: <b>${esc(h.weakest.type)}</b> ${h.weakest.rate}%</div>`
      : "";
  return `
    <h2>Validation habits</h2>
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

/** Suggested next step — the highest-leverage fix(es) from the Skill Finder. */
function suggestionsSection(list: SkillSuggestion[] | undefined): string {
  if (!list || list.length === 0) {
    return "";
  }
  const rows = list
    .slice(0, 2)
    .map((s) => {
      const body =
        s.action.kind === "guidance"
          ? `<ul class="sg-steps">${s.action.steps.map((st) => `<li>${esc(st)}</li>`).join("")}</ul>`
          : `<div class="sg-oneclick">One-click: run <b>Agent Karma: Find Validation Gaps</b> and choose <b>Install nudge</b>.</div>`;
      return `
        <div class="suggestion sg-${esc(s.severity)}">
          <div class="sg-title">${esc(s.title)}</div>
          <div class="sg-why muted">${esc(s.rationale)}</div>
          ${body}
        </div>`;
    })
    .join("");
  return `
    <h2>Suggested next step</h2>
    ${rows}`;
}

/**
 * One cell of the bento grid. `span` makes it full-width; `carded` means the inner
 * content already provides its own card chrome (so we use a transparent slot instead
 * of drawing a second border). Empty content yields no cell.
 */
function gridItem(
  inner: string,
  opts: { span?: boolean; carded?: boolean } = {}
): string {
  if (!inner || inner.trim() === "") {
    return "";
  }
  const chrome = opts.carded ? "bento-slot" : "bento-card";
  return `<div class="${chrome}${opts.span ? " span-2" : ""}">${inner}</div>`;
}

/** A CSS-only collapsible section (native <details> — no JS, CSP-safe). */
function collapsible(title: string, inner: string, open = false): string {
  if (!inner || inner.trim() === "") {
    return "";
  }
  return `<details class="sec"${open ? " open" : ""}><summary>${esc(title)}</summary><div class="sec-body">${inner}</div></details>`;
}

/** The inspiring Dharma/Karma/Phal reflection banner. */
function karmicBanner(data: DashboardData): string {
  const m = karmicMessage(data.stats ?? EMPTY_STATS, data.lastCompleted);
  const sub = m.sub ? `<div class="karmic-sub">${esc(m.sub)}</div>` : "";
  return `
    <div class="karmic karmic-${m.mood}">
      <div class="karmic-lamp">🪔</div>
      <div class="karmic-text">
        <div class="karmic-headline">${esc(m.headline)}</div>
        ${sub}
      </div>
    </div>`;
}

/** Trend lines — Karma and validation rate over recent sessions. */
function trendsSection(stats: DashboardStats): string {
  const score = stats.scoreSeries ?? [];
  const val = stats.validationTrend ?? [];
  // Trends only mean something with a few sessions of history (keeps the forming state calm).
  if (score.length < 5 && val.length < 5) {
    return "";
  }
  const block = (label: string, cur: string, svg: string): string => `
    <div class="trend-block">
      <div class="trend-head"><span class="trend-name">${label}</span><span class="trend-cur">${cur}</span></div>
      ${svg}
    </div>`;
  const lastScore = score.length ? `${Math.round(score[score.length - 1])}` : "—";
  const lastVal = val.length ? `${val[val.length - 1]}%` : "—";
  return `
    <h2>Trends</h2>
    <div class="trends">
      ${score.length >= 5 ? block("Karma", lastScore, trendLine(score, { color: "var(--ak-info)" })) : ""}
      ${val.length >= 5 ? block("Validation rate", lastVal, trendLine(val, { color: "var(--ak-good)" })) : ""}
    </div>`;
}

/** Validation heatmap — where (task type) you run which checks. */
function heatmapSection(data: DashboardData): string {
  const hm = data.heatmap;
  if (!hm || hm.rows.length === 0) {
    return "";
  }
  const worst = worstTaskCheck(hm.rows);
  const callout = worst
    ? `<p class="heat-callout">⚠ Your biggest gap: <b>${esc(worst.check)}</b> on <b>${esc(worst.task)}</b> tasks — ${worst.rate}% over ${worst.n} sessions.</p>`
    : "";
  return `
    <h2>Where you validate</h2>
    ${heatmap(hm.rows, hm.colLabels)}
    ${callout}`;
}

/** High-risk watchlist — risky work you never validated. A literal to-do list. */
function watchlistSection(items: WatchItem[] | undefined): string {
  if (!items || items.length === 0) {
    return "";
  }
  const rows = items
    .map(
      (it) =>
        `<li><span class="wl-title">${esc(it.title)}</span> <span class="muted">${esc(it.taskType)}</span></li>`
    )
    .join("");
  return `
    <h2>⚠ Worth a second look</h2>
    <p class="muted">High-risk work you changed but never validated — consider going back.</p>
    <ul class="watchlist">${rows}</ul>`;
}

/** Score composition — how much of your Karma is real verification vs. near-free points. */
function scoreCompositionSection(comp: ScoreComposition | undefined): string {
  if (!comp || comp.total === 0) {
    return "";
  }
  const segs = comp.segs
    .map((s) => {
      const pct = ((s.points / comp.total) * 100).toFixed(1);
      return `<span class="seg seg-${s.category}" style="width:${pct}%" title="${esc(s.label)}: ${s.points} pts"></span>`;
    })
    .join("");
  const read =
    comp.realPct >= 60
      ? `${comp.realPct}% of your Karma comes from real test/build/lint runs — a solid base.`
      : `Only ${comp.realPct}% of your Karma comes from real verification; the rest is near-free points. Running tests would make it real.`;
  return `
    <h2>What your Karma is made of</h2>
    <div class="stack comp-stack">${segs}</div>
    <div class="comp-legend">
      <span><i class="lg seg-real"></i> real verification</span>
      <span><i class="lg seg-cheap"></i> near-free points</span>
    </div>
    <p class="comp-read">${esc(read)}</p>`;
}

/** Validation Consistency Strip — your validation rhythm across recent sessions. */
function consistencySummary(c: NonNullable<DashboardStats["consistency"]>): string {
  const base = `You validated ${c.validatedCount} of your last ${c.total}`;
  if (c.currentRun >= 2) {
    const best = c.bestRun > c.currentRun ? ` Your best run is ${c.bestRun}.` : "";
    return `${base} — and your last ${c.currentRun} in a row.${best}`;
  }
  if (c.currentRun === 1) {
    return `${base}. You validated your latest — keep it going.`;
  }
  const best = c.bestRun >= 3 ? ` (your best run is ${c.bestRun})` : "";
  return `${base}. Your latest wasn't validated — validate your next to start a fresh run${best}.`;
}

function consistencySection(stats: DashboardStats): string {
  const c = stats.consistency;
  if (!c || c.total < 2) {
    return "";
  }
  return `
    <h2>Validation consistency</h2>
    <p class="muted streak-sub">Each square is one recent session — did you validate it?</p>
    ${validationStreak(stats.validationCells ?? [])}
    <div class="streak-legend">
      <span><i class="lg c-good"></i> validated</span>
      <span><i class="lg c-risk"></i> not validated</span>
      <span><i class="lg c-empty"></i> nothing to validate</span>
      <span class="streak-axis">oldest → latest</span>
    </div>
    <p class="consistency-read">${esc(consistencySummary(c))}</p>`;
}

/** Risk × validation — did you validate the work that actually mattered? */
function riskValidationSection(stats: DashboardStats): string {
  const riskValidation = stats.riskValidation ?? [];
  const tiers = riskValidation.filter((t) => t.total > 0);
  if (tiers.length === 0) {
    return "";
  }
  const overall = stats.validationRate ?? 0;
  const rows = tiers
    .map((t) => {
      const warn = t.tier === "High" && t.rate < overall;
      const note =
        t.tier === "Low" ? `<span class="rv-count muted">optional here</span>` : "";
      return `
      <div class="rv-row">
        <span class="rv-tier ${warn ? "rv-warn" : ""}">${t.tier}</span>
        ${percentBar(t.rate)}
        <span class="rv-pct">${t.rate}%</span>
        <span class="rv-count muted">${t.validated}/${t.total}</span>
        ${note}
      </div>`;
    })
    .join("");
  const high = riskValidation.find((t) => t.tier === "High");
  let read = "";
  if (high && high.total > 0) {
    read =
      high.rate < overall
        ? `<p class="rv-read rv-warn">⚠ Your validation drops on exactly the work where it matters most.</p>`
        : `<p class="rv-read">Your riskiest work is among your most-validated — exactly right.</p>`;
  }
  return `
    <h2>Did you validate the risky work?</h2>
    <div class="rv">${rows}</div>
    ${read}`;
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

/**
 * Active / Previous sessions in one tabbed card. Pure CSS tabs (hidden radio inputs +
 * label `for`, switched by the :checked sibling selector) — no JS, CSP-safe. Defaults
 * to Active when a session is recording, otherwise to Previous.
 */
function sessionTabs(data: DashboardData): string {
  const activeChecked = data.active ? " checked" : "";
  const prevChecked = data.active ? "" : " checked";
  const activeBody = activeSection(data.active, data.activeEvents ?? []);
  const prevBody =
    lastSessionSection(data.lastCompleted, data.lastCompletedEvents ?? []) +
    karmaMoveCard(data.karmaMove);
  return `
    <div class="tabs">
      <input type="radio" name="sess-tab" id="sess-active" class="tab-radio"${activeChecked} />
      <input type="radio" name="sess-tab" id="sess-prev" class="tab-radio"${prevChecked} />
      <div class="tab-bar">
        <label for="sess-active">Active${data.active ? ' <span class="tab-dot"></span>' : ""}</label>
        <label for="sess-prev">Previous</label>
      </div>
      <div class="tab-panel panel-active">${activeBody}</div>
      <div class="tab-panel panel-prev">${prevBody}</div>
    </div>`;
}

function activeSection(
  active: AgentKarmaSession | undefined,
  events: AgentKarmaEvent[]
): string {
  if (!active) {
    return `<p class="muted">No active session. Click <b>▶ Agent Karma: Start</b> in the status bar to begin.</p>`;
  }
  return `
    <div class="recording-head"><span class="badge">● Recording</span></div>
    <h3>${esc(active.title)}</h3>
    <dl>
      <dt>AI tool</dt><dd>${esc(active.aiTool)}</dd>
      <dt>Task type</dt><dd>${esc(active.taskType)}</dd>
      <dt>Started</dt><dd>${esc(active.startedAt)}</dd>
      <dt>Intent</dt><dd>${esc(active.intent) || "<span class='muted'>—</span>"}</dd>
    </dl>
    ${captureSummary(events)}
    ${dharmaCardHtml(active)}`;
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
    ${traceHtml}`;
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
    : "Every point of Karma traces to one of these rules.";
  return `
    <p class="muted">${lead}</p>
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
    :root {
      --sp-1: 4px; --sp-2: 8px; --sp-3: 12px; --sp-4: 16px; --sp-5: 24px; --sp-6: 32px; --sp-7: 48px;
      --r-sm: 8px; --r-md: 12px; --r-pill: 999px;
      --fs-display: 2.75rem; --fs-h1: 1.375rem; --fs-title: 1.0625rem;
      --fs-body: 0.875rem; --fs-label: 0.6875rem; --fs-caption: 0.8125rem; --fs-num: 1.5rem;
      --ak-border: color-mix(in srgb, var(--vscode-panel-border) 70%, transparent);
      --ak-surface-1: color-mix(in srgb, var(--vscode-foreground) 3%, transparent);
      --ak-surface-2: color-mix(in srgb, var(--vscode-foreground) 6%, transparent);
      --ak-hairline: color-mix(in srgb, var(--vscode-foreground) 8%, transparent);
      --ak-good: var(--vscode-charts-green, #388a34);
      --ak-warn: var(--vscode-charts-yellow, #b89500);
      --ak-risk: var(--vscode-charts-red, #e51400);
      --ak-info: var(--vscode-charts-blue, #3794ff);
      --ak-good-bg: color-mix(in srgb, var(--ak-good) 12%, transparent);
      --ak-warn-bg: color-mix(in srgb, var(--ak-warn) 13%, transparent);
      --ak-risk-bg: color-mix(in srgb, var(--ak-risk) 13%, transparent);
      --ak-info-bg: color-mix(in srgb, var(--ak-info) 12%, transparent);
    }
    body { font-family: 'Manrope', var(--vscode-font-family), -apple-system, 'Segoe UI', sans-serif; -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility; color: var(--vscode-foreground); line-height: 1.55; max-width: 720px; margin: 0 auto; padding: var(--sp-6) var(--sp-5) var(--sp-7); }
    h1 { font-size: var(--fs-h1); font-weight: 700; margin: 0; letter-spacing: -0.02em; }
    .tagline { color: var(--vscode-descriptionForeground); margin-top: var(--sp-1); font-size: var(--fs-caption); }
    h2 { display: flex; align-items: center; gap: var(--sp-3); font-size: var(--fs-label); font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: var(--vscode-descriptionForeground); margin: var(--sp-7) 0 var(--sp-4); padding: 0; border: 0; }
    h2::after { content: ""; flex: 1; height: 1px; background: linear-gradient(90deg, var(--ak-hairline), transparent); }
    h3 { font-size: var(--fs-title); font-weight: 650; margin: 0 0 var(--sp-2); letter-spacing: -0.011em; }
    .muted { color: var(--vscode-descriptionForeground); }
    /* bento grid layout */
    .bento { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--sp-4); align-items: stretch; margin-top: var(--sp-5); }
    .bento-card { border: 1px solid var(--ak-border); border-radius: var(--r-md); padding: var(--sp-4) var(--sp-5); background: var(--ak-surface-1); min-width: 0; }
    .bento-slot { min-width: 0; }
    .span-2 { grid-column: 1 / -1; }
    .bento h2 { margin-top: 0; }
    .bento .hero { margin-top: 0; }
    .bento-card > .sec { border-top: 0; margin-top: 0; }
    .bento-card > .sec > summary { padding-top: 0; }
    .recording-head { margin-bottom: var(--sp-2); }
    /* karmic reflection banner */
    .karmic { display: flex; gap: var(--sp-4); align-items: flex-start; padding: var(--sp-4) var(--sp-5); border: 1px solid var(--ak-border); border-radius: var(--r-md); background: linear-gradient(135deg, var(--karmic-bg, var(--ak-surface-2)), transparent 70%); }
    .karmic-lamp { font-size: 1.7rem; line-height: 1.2; filter: saturate(1.1); }
    .karmic-headline { font-size: 1.0625rem; font-weight: 350; line-height: 1.45; letter-spacing: -0.01em; color: var(--vscode-foreground); }
    .karmic-sub { margin-top: var(--sp-2); font-size: var(--fs-caption); color: var(--vscode-descriptionForeground); }
    .karmic-luminous { --karmic-bg: color-mix(in srgb, var(--ak-good) 16%, transparent); }
    .karmic-steady { --karmic-bg: color-mix(in srgb, var(--ak-info) 16%, transparent); }
    .karmic-forming { --karmic-bg: color-mix(in srgb, var(--ak-warn) 15%, transparent); }
    .karmic-dim { --karmic-bg: color-mix(in srgb, var(--ak-risk) 13%, transparent); }
    @media (max-width: 640px) { .bento { grid-template-columns: 1fr; } }
    /* CSS-only tabs (hidden radios + :checked sibling) — no JS */
    .tabs .tab-radio { position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none; }
    .tab-bar { display: flex; gap: var(--sp-5); border-bottom: 1px solid var(--ak-border); margin-bottom: var(--sp-3); }
    .tab-bar label { padding: var(--sp-2) 0; cursor: pointer; font-size: var(--fs-label); font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--vscode-descriptionForeground); border-bottom: 2px solid transparent; margin-bottom: -1px; display: inline-flex; align-items: center; gap: 6px; }
    .tab-bar label:hover { color: var(--vscode-foreground); }
    .tab-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--ak-risk); display: inline-block; }
    .tab-panel { display: none; }
    #sess-active:checked ~ .tab-bar label[for="sess-active"],
    #sess-prev:checked ~ .tab-bar label[for="sess-prev"] { color: var(--vscode-foreground); border-bottom-color: var(--ak-info); }
    #sess-active:checked ~ .panel-active,
    #sess-prev:checked ~ .panel-prev { display: block; }
    p { margin: var(--sp-2) 0; }
    /* card primitive */
    .card { border: 1px solid var(--ak-border); border-radius: var(--r-md); padding: var(--sp-4) var(--sp-5); background: var(--ak-surface-1); }
    .card.recording { border-color: color-mix(in srgb, var(--ak-risk) 45%, var(--ak-border)); }
    .badge { color: var(--ak-risk); font-weight: 600; font-size: var(--fs-caption); display: inline-flex; align-items: center; gap: var(--sp-1); }
    dl { display: grid; grid-template-columns: max-content 1fr; gap: var(--sp-1) var(--sp-4); margin: var(--sp-3) 0 0; font-size: var(--fs-body); }
    dt { color: var(--vscode-descriptionForeground); }
    dd { margin: 0; font-variant-numeric: tabular-nums; }
    table { border-collapse: collapse; width: 100%; font-size: var(--fs-body); margin-top: var(--sp-2); }
    th, td { text-align: left; padding: var(--sp-2) var(--sp-3); border-bottom: 1px solid var(--ak-hairline); }
    th { color: var(--vscode-descriptionForeground); font-weight: 600; font-size: var(--fs-label); letter-spacing: 0.06em; text-transform: uppercase; }
    td { font-variant-numeric: tabular-nums; }
    tbody tr:hover { background: var(--ak-surface-1); }
    .dharma { margin-top: var(--sp-3); padding-top: var(--sp-3); border-top: 1px solid var(--ak-hairline); }
    .dharma-head { font-weight: 600; font-size: var(--fs-caption); margin-bottom: var(--sp-1); }
    .hint { font-weight: 450; font-size: var(--fs-caption); color: var(--vscode-descriptionForeground); font-style: italic; margin-left: var(--sp-2); text-transform: none; }
    /* pills / badges (unified) */
    .outcome, .risk-flag { display: inline-flex; align-items: center; gap: var(--sp-1); font-weight: 600; font-size: var(--fs-label); text-transform: uppercase; letter-spacing: 0.05em; padding: 5px 10px; border-radius: var(--r-pill); margin-bottom: var(--sp-2); color: var(--accent, var(--vscode-foreground)); background: var(--accent-bg, var(--ak-surface-2)); }
    .outcome-ready-for-review, .risk-ok { --accent: var(--ak-good); --accent-bg: var(--ak-good-bg); }
    .outcome-needs-review { --accent: var(--ak-warn); --accent-bg: var(--ak-warn-bg); }
    .outcome-high-risk, .risk-warn { --accent: var(--ak-risk); --accent-bg: var(--ak-risk-bg); }
    .outcome-informational { --accent: var(--vscode-descriptionForeground); --accent-bg: color-mix(in srgb, var(--vscode-foreground) 8%, transparent); }
    .recs ul { margin: var(--sp-1) 0 0; padding-left: var(--sp-4); }
    .trace { background: color-mix(in srgb, var(--vscode-foreground) 4%, transparent); border: 1px solid var(--ak-hairline); padding: var(--sp-3); border-radius: var(--r-sm); font-size: var(--fs-caption); white-space: pre-wrap; overflow-x: auto; }
    .checklist { list-style: none; margin: var(--sp-2) 0 0; padding-left: 0; }
    .checklist li { font-size: var(--fs-body); padding: 2px 0; }
    .scoreline { margin-top: var(--sp-2); font-size: var(--fs-body); }
    .scoreline b { font-size: var(--fs-num); font-weight: 350; font-variant-numeric: tabular-nums; }
    .trend { color: var(--vscode-descriptionForeground); font-size: var(--fs-caption); margin-left: var(--sp-2); }
    /* hero (the one elevated surface) */
    .hero { display: flex; flex-wrap: wrap; align-items: center; gap: var(--sp-5); margin: var(--sp-5) 0 var(--sp-4); padding: var(--sp-5); background: var(--ak-surface-2); border: 1px solid var(--ak-border); border-radius: var(--r-md); box-shadow: inset 0 1px 0 var(--ak-hairline); }
    .gauge-wrap { flex: 0 0 auto; }
    .gauge-num { fill: var(--vscode-foreground); font-size: 1.9rem; font-weight: 300; letter-spacing: -0.02em; }
    .gauge-cap { fill: var(--vscode-descriptionForeground); font-size: 0.5rem; font-weight: 600; letter-spacing: 0.12em; }
    .hero-meta { display: flex; flex-direction: column; gap: var(--sp-1); }
    .hero-label { font-size: var(--fs-title); font-weight: 600; }
    .hero-sub { color: var(--vscode-descriptionForeground); font-size: var(--fs-caption); }
    .hero-empty .gauge-num { fill: var(--vscode-descriptionForeground); }
    .karma-quiet { font-size: var(--fs-body); font-weight: 600; letter-spacing: -0.01em; }
    /* stat tiles */
    .glance { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: var(--sp-3); margin: 0 0 var(--sp-4); }
    .g-item { border: 1px solid var(--ak-border); border-radius: var(--r-md); padding: var(--sp-4); background: var(--ak-surface-1); display: flex; flex-direction: column; gap: var(--sp-2); }
    .g-wide { grid-column: 1 / -1; }
    .g-label { color: var(--vscode-descriptionForeground); font-size: var(--fs-label); font-weight: 600; text-transform: uppercase; letter-spacing: 0.07em; }
    .g-value { font-size: var(--fs-num); font-weight: 350; letter-spacing: -0.02em; line-height: 1; font-variant-numeric: tabular-nums; display: flex; align-items: center; gap: var(--sp-2); }
    .g-value b { font-weight: 350; }
    .g-value .muted { font-size: 0.62em; font-weight: 450; }
    /* charts */
    .spark { color: var(--ak-info); display: block; }
    .bar { display: inline-flex; flex: 1; min-width: 64px; height: 6px; border-radius: var(--r-pill); background: var(--ak-surface-2); box-shadow: inset 0 0 0 1px var(--ak-hairline); overflow: hidden; vertical-align: middle; }
    .bar-fill { display: block; height: 100%; border-radius: var(--r-pill); background: var(--ak-good); }
    .stack { display: flex; gap: 1px; width: 100%; height: 10px; border-radius: var(--r-sm); overflow: hidden; background: var(--ak-hairline); }
    .seg { display: block; height: 100%; }
    .seg-ready { background: var(--ak-good); }
    .seg-needs { background: var(--ak-warn); }
    .seg-high { background: var(--ak-risk); }
    .seg-info { background: var(--vscode-descriptionForeground); }
    /* validation consistency strip */
    .streak-sub { font-size: var(--fs-caption); margin: 0 0 var(--sp-2); }
    .ak-streak { display: flex; gap: 5px; flex-wrap: wrap; margin: var(--sp-2) 0; }
    .ak-streak__cell { width: 17px; height: 17px; border-radius: 5px; background: var(--ak-surface-2); box-shadow: inset 0 0 0 1px var(--ak-hairline); }
    .ak-streak__cell.c-good { background: var(--ak-good); box-shadow: none; }
    .ak-streak__cell.c-warn { background: var(--ak-warn); box-shadow: none; }
    .ak-streak__cell.c-risk { background: var(--ak-risk); box-shadow: none; }
    .ak-streak__cell.c-empty { background: var(--ak-surface-2); }
    .streak-legend { display: flex; flex-wrap: wrap; align-items: center; gap: var(--sp-3); margin: var(--sp-2) 0; font-size: var(--fs-caption); color: var(--vscode-descriptionForeground); }
    .streak-legend span { display: inline-flex; align-items: center; gap: 6px; }
    .streak-legend .lg { width: 11px; height: 11px; border-radius: 3px; display: inline-block; }
    .lg.c-good { background: var(--ak-good); }
    .lg.c-risk { background: var(--ak-risk); }
    .lg.c-empty { background: var(--ak-surface-2); box-shadow: inset 0 0 0 1px var(--ak-hairline); }
    .streak-axis { margin-left: auto; }
    .consistency-read { font-size: var(--fs-body); margin-top: var(--sp-2); }
    /* risk x validation */
    .rv { display: flex; flex-direction: column; gap: var(--sp-2); }
    .rv-row { display: flex; align-items: center; gap: var(--sp-3); font-size: var(--fs-body); }
    .rv-tier { flex: 0 0 4.5rem; font-weight: 600; }
    .rv-tier.rv-warn { color: var(--ak-risk); }
    .rv-pct { flex: 0 0 2.8rem; text-align: right; font-weight: 600; font-variant-numeric: tabular-nums; }
    .rv-count { flex: 0 0 auto; font-size: var(--fs-caption); }
    .rv-read { font-size: var(--fs-body); margin-top: var(--sp-2); }
    .rv-read.rv-warn { color: var(--ak-risk); font-weight: 600; }
    /* accent-rail blocks (reflection / suggestion / karma-move) */
    .reflection, .suggestion, .karma-move { border: 1px solid var(--ak-border); border-left: 3px solid var(--accent, var(--ak-info)); background: var(--ak-surface-1); border-radius: var(--r-md); padding: var(--sp-3) var(--sp-4); margin: var(--sp-3) 0; }
    .refl-good { --accent: var(--ak-good); }
    .refl-suggest { --accent: var(--ak-warn); }
    .refl-neutral { --accent: var(--vscode-descriptionForeground); }
    .refl-head { font-weight: 600; font-size: var(--fs-caption); }
    .refl-summary { color: var(--vscode-descriptionForeground); font-size: var(--fs-caption); margin: var(--sp-1) 0; }
    .refl-nudge { font-size: var(--fs-body); }
    .move-up { --accent: var(--ak-good); }
    .move-down { --accent: var(--ak-risk); }
    .move-flat { --accent: var(--vscode-descriptionForeground); }
    .move-head { font-weight: 600; font-size: var(--fs-caption); }
    .move-summary { font-size: var(--fs-body); margin-top: var(--sp-1); }
    /* habits */
    .habits { display: flex; flex-direction: column; }
    .habit { display: flex; align-items: center; gap: var(--sp-3); padding: var(--sp-2) 0; }
    .habit-label { flex: 0 0 5.5rem; font-size: var(--fs-body); }
    .habit-pct { flex: 0 0 2.6rem; text-align: right; font-size: var(--fs-body); font-weight: 600; font-variant-numeric: tabular-nums; }
    .habit-trend { flex: 0 0 4.5rem; font-size: var(--fs-caption); color: var(--vscode-descriptionForeground); }
    .habit-trend.ht-rising { color: var(--ak-good); }
    .habit-trend.ht-slipping { color: var(--ak-warn); }
    .habit-insight { margin-top: var(--sp-3); font-size: var(--fs-body); color: var(--vscode-descriptionForeground); }
    /* validation context health */
    .ready { display: flex; flex-direction: column; }
    .ready-row { display: grid; grid-template-columns: 1.2rem 9rem 1fr; align-items: baseline; gap: var(--sp-3); padding: var(--sp-2) 0; border-bottom: 1px solid var(--ak-hairline); font-size: var(--fs-body); }
    .ready-row:last-child { border-bottom: 0; }
    .ready-mark { font-weight: 700; text-align: center; }
    .ready-yes { color: var(--ak-good); }
    .ready-no { color: var(--vscode-descriptionForeground); }
    .ready-label { font-weight: 600; }
    .ready-detail { font-size: var(--fs-caption); }
    .ready-score { font-weight: 700; color: var(--vscode-foreground); font-variant-numeric: tabular-nums; }
    .ready-gap { margin-top: var(--sp-3); font-size: var(--fs-body); padding: var(--sp-3); border-radius: var(--r-sm); background: var(--ak-warn-bg); }
    /* karma rules reference */
    .rules { display: flex; flex-direction: column; }
    .rule-row { display: grid; grid-template-columns: 1.2rem 12rem 2rem 1fr; align-items: baseline; gap: var(--sp-3); padding: var(--sp-2) 0; border-bottom: 1px solid var(--ak-hairline); font-size: var(--fs-body); }
    .rule-row:last-child { border-bottom: 0; }
    .rule-headrow { font-size: var(--fs-label); letter-spacing: 0.06em; text-transform: uppercase; color: var(--vscode-descriptionForeground); border-bottom: 1px solid var(--ak-border); }
    .rule-mark { font-weight: 700; text-align: center; }
    .rule-yes { color: var(--ak-good); }
    .rule-no { color: var(--vscode-descriptionForeground); }
    .rule-label { font-weight: 600; }
    .rule-weight { text-align: right; font-variant-numeric: tabular-nums; color: var(--vscode-descriptionForeground); }
    .rule-desc { font-size: var(--fs-caption); }
    /* suggested next step (skill finder) */
    .sg-high { --accent: var(--ak-risk); }
    .sg-medium { --accent: var(--ak-warn); }
    .sg-low { --accent: var(--ak-info); }
    .sg-title { font-weight: 650; font-size: var(--fs-title); }
    .sg-why { color: var(--vscode-descriptionForeground); font-size: var(--fs-caption); margin: var(--sp-1) 0 var(--sp-2); }
    .sg-steps { margin: var(--sp-1) 0 0; padding-left: var(--sp-4); font-size: var(--fs-body); }
    .sg-steps li { padding: 2px 0; }
    .sg-oneclick { font-size: var(--fs-body); padding: var(--sp-2) var(--sp-3); border-radius: var(--r-sm); margin-top: var(--sp-2); background: var(--ak-good-bg); }
    /* collapsible sections (native <details>, no JS) */
    .sec { margin: var(--sp-5) 0 0; border-top: 1px solid var(--ak-hairline); }
    .sec > summary { display: flex; align-items: center; gap: var(--sp-2); list-style: none; cursor: pointer; padding: var(--sp-4) 0 0; font-size: var(--fs-label); font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: var(--vscode-descriptionForeground); }
    .sec > summary::-webkit-details-marker { display: none; }
    .sec > summary::before { content: "›"; display: inline-block; font-size: 1.1em; line-height: 1; transition: transform 0.15s ease; color: var(--vscode-descriptionForeground); }
    .sec[open] > summary::before { transform: rotate(90deg); }
    .sec > summary:hover { color: var(--vscode-foreground); }
    .sec-body { padding-top: var(--sp-3); }
    /* trend lines */
    .trends { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: var(--sp-4); }
    .trend-block { border: 1px solid var(--ak-border); border-radius: var(--r-md); padding: var(--sp-3) var(--sp-4) var(--sp-2); background: var(--ak-surface-1); }
    .trend-head { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: var(--sp-1); }
    .trend-name { font-size: var(--fs-label); font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--vscode-descriptionForeground); }
    .trend-cur { font-size: var(--fs-num); font-weight: 350; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }
    .trendline { width: 100%; height: auto; display: block; }
    /* heatmap */
    .hm { display: grid; grid-template-columns: minmax(5.5rem, auto) repeat(var(--hm-cols), 1fr); gap: 3px; align-items: stretch; }
    .hm-corner { }
    .hm-col { font-size: var(--fs-label); text-transform: uppercase; letter-spacing: 0.05em; color: var(--vscode-descriptionForeground); text-align: center; padding-bottom: 2px; }
    .hm-rowlabel { font-size: var(--fs-body); display: flex; align-items: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .hm-cell { min-height: 28px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: var(--fs-caption); font-variant-numeric: tabular-nums; color: var(--vscode-foreground); background: var(--ak-surface-2); }
    .hm-empty { background: var(--ak-hairline); color: transparent; }
    .heat-callout { font-size: var(--fs-body); margin-top: var(--sp-3); padding: var(--sp-2) var(--sp-3); border-radius: var(--r-sm); background: var(--ak-warn-bg); }
    /* high-risk watchlist */
    .watchlist { list-style: none; margin: var(--sp-2) 0 0; padding: 0; }
    .watchlist li { display: flex; align-items: baseline; justify-content: space-between; gap: var(--sp-3); padding: var(--sp-2) 0; border-bottom: 1px solid var(--ak-hairline); font-size: var(--fs-body); }
    .watchlist li:last-child { border-bottom: 0; }
    .wl-title { font-weight: 600; }
    /* score composition */
    .seg-real { background: var(--ak-good); }
    .seg-cheap { background: var(--vscode-descriptionForeground); }
    .comp-stack { height: 14px; margin: var(--sp-2) 0; }
    .comp-legend { display: flex; gap: var(--sp-4); font-size: var(--fs-caption); color: var(--vscode-descriptionForeground); }
    .comp-legend span { display: inline-flex; align-items: center; gap: 6px; }
    .comp-legend .lg { width: 11px; height: 11px; border-radius: 3px; display: inline-block; }
    .comp-read { font-size: var(--fs-body); margin-top: var(--sp-2); }
    footer { margin-top: var(--sp-7); padding-top: var(--sp-4); border-top: 1px solid var(--ak-hairline); color: var(--vscode-descriptionForeground); font-size: var(--fs-caption); }
  </style>
  <title>Agent Karma</title>
</head>
<body>
  <h1>Agent Karma</h1>
  <p class="tagline">Did you validate what the AI produced — before you trusted it?</p>

  <div class="bento">
    ${gridItem(karmicBanner(data), { span: true, carded: true })}
    ${gridItem(glanceSection(data.stats ?? EMPTY_STATS), { span: true, carded: true })}
    ${gridItem(sessionTabs(data), { span: true })}
    ${gridItem(watchlistSection(data.watchlist), { span: true })}
    ${gridItem(consistencySection(data.stats ?? EMPTY_STATS))}
    ${gridItem(riskValidationSection(data.stats ?? EMPTY_STATS))}
    ${gridItem(trendsSection(data.stats ?? EMPTY_STATS), { span: true })}
    ${gridItem(heatmapSection(data), { span: true })}
    ${gridItem(scoreCompositionSection(data.scoreComposition), { span: true })}
    ${gridItem(habitsSection(data.validationHabits))}
    ${gridItem(readinessSection(data.readiness))}
    ${gridItem(suggestionsSection(data.suggestions), { span: true, carded: true })}
    ${gridItem(reflectionCard(data.reflection), { span: true, carded: true })}
    ${gridItem(collapsible("Karma rules", karmaRulesSection(data.lastCompleted)), { span: true })}
    ${gridItem(collapsible("Recent sessions", recentSection(data.recent)), { span: true })}
  </div>

  <footer>Local-first. No source code captured. No cloud upload.</footer>
</body>
</html>`;
}
