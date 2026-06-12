import { AgentKarmaSession, ValidationCommandType } from "../core/types";
import { StreakCell } from "./charts";

// Pure aggregation of session history into the dashboard's "at a glance" stats.
// These are OUR signals — validation discipline, score trend, outcome mix — never
// usage volume. Computed over the last N completed sessions.

export interface DashboardStats {
  /** Rolling self-comparative Karma (EMA), rounded. Undefined until a session exists. */
  rollingKarma?: number;
  lastTrend?: "up" | "down" | "flat";
  /** Total completed sessions. */
  sessionCount: number;
  /** How many of the recent window we measured (≤ N). */
  recentCount: number;
  /** % of recent sessions where validation was detected (0–100). */
  validationRate?: number;
  /** Recent sessions in which a Test command was logged/observed. */
  testsRunCount: number;
  /** Karma scores of recent sessions, chronological (for the sparkline). */
  scoreSeries: number[];
  outcomes: { ready: number; needs: number; highRisk: number; informational: number };
  /** Per-session validation outcome cells (oldest→latest) for the consistency strip. */
  validationCells?: { cell: StreakCell; label: string }[];
  /** Validation rhythm over the strip window. */
  consistency?: { validatedCount: number; total: number; currentRun: number; bestRun: number };
  /** Validation rate within each risk tier — the product's sharpest signal. */
  riskValidation?: { tier: "High" | "Medium" | "Low"; total: number; validated: number; rate: number }[];
  /** Rolling validation-rate trend (smoothed % over a moving window), for a trend line. */
  validationTrend?: number[];
}

const STREAK_WINDOW = 24;

/**
 * A session's consistency cell answers exactly one question: did you validate it?
 * green = validated · red = changed code but didn't · grey = nothing to validate.
 */
function sessionToCell(s: AgentKarmaSession): { cell: StreakCell; label: string } {
  if (s.phalCard?.validationDetected) {
    return { cell: "good", label: `${s.title}: validated` };
  }
  if (!s.phalCard || s.phalCard.outcome === "Informational") {
    return { cell: "empty", label: `${s.title}: nothing to validate` };
  }
  return { cell: "risk", label: `${s.title}: not validated` };
}

/** Longest and trailing run of validated sessions in a chronological boolean series. */
function runs(validated: boolean[]): { currentRun: number; bestRun: number } {
  let best = 0;
  let cur = 0;
  for (const v of validated) {
    cur = v ? cur + 1 : 0;
    if (cur > best) {
      best = cur;
    }
  }
  let tail = 0;
  for (let i = validated.length - 1; i >= 0 && validated[i]; i--) {
    tail++;
  }
  return { currentRun: tail, bestRun: best };
}

export type HabitTrend = "rising" | "steady" | "slipping";

/** How consistently you run each kind of validation — your strengths and gaps. */
export interface ValidationHabits {
  recentCount: number;
  rates: { type: ValidationCommandType; rate: number; trend: HabitTrend }[];
  strongest?: { type: ValidationCommandType; rate: number };
  weakest?: { type: ValidationCommandType; rate: number };
}

const HABIT_TYPES: ValidationCommandType[] = ["Test", "Build", "Lint", "Type Check"];

function ranType(s: AgentKarmaSession, type: ValidationCommandType): boolean {
  return !!s.phalCard?.commandsDetected?.some((c) => c.type === type);
}

function rateOf(sessions: AgentKarmaSession[], type: ValidationCommandType): number {
  return sessions.length === 0
    ? 0
    : Math.round((sessions.filter((s) => ranType(s, type)).length / sessions.length) * 100);
}

/** Direction of a check's habit: recent-half rate vs. earlier-half rate (needs ≥4 sessions). */
function habitTrend(recent: AgentKarmaSession[], type: ValidationCommandType): HabitTrend {
  if (recent.length < 4) {
    return "steady";
  }
  const mid = Math.floor(recent.length / 2);
  const delta = rateOf(recent.slice(mid), type) - rateOf(recent.slice(0, mid), type);
  return delta > 10 ? "rising" : delta < -10 ? "slipping" : "steady";
}

export function computeValidationHabits(
  sessions: AgentKarmaSession[],
  lastN = 15
): ValidationHabits {
  const recent = sessions.filter((s) => s.status === "completed").slice(-lastN);
  const n = recent.length;
  const rates = HABIT_TYPES.map((type) => ({
    type,
    rate: rateOf(recent, type),
    trend: habitTrend(recent, type),
  }));
  if (n === 0) {
    return { recentCount: 0, rates };
  }
  const sorted = [...rates].sort((a, b) => b.rate - a.rate);
  return { recentCount: n, rates, strongest: sorted[0], weakest: sorted[sorted.length - 1] };
}

/** One row of a per-dimension breakdown (validation discipline, not usage volume). */
export interface BreakdownRow {
  key: string;
  sessions: number;
  validationRate: number; // 0–100
  avgKarma?: number;
}

/**
 * Group completed sessions by AI tool or task type and report how consistently
 * each was validated (+ avg Karma). This is a self-insight ("where do I validate
 * well?"), never a usage count. Sorted by session volume, then validation rate.
 */
export function computeBreakdown(
  sessions: AgentKarmaSession[],
  dimension: "aiTool" | "taskType"
): BreakdownRow[] {
  const completed = sessions.filter((s) => s.status === "completed");
  const groups = new Map<string, AgentKarmaSession[]>();
  for (const s of completed) {
    const key = dimension === "aiTool" ? s.aiTool : s.taskType;
    const arr = groups.get(key);
    if (arr) {
      arr.push(s);
    } else {
      groups.set(key, [s]);
    }
  }
  const rows: BreakdownRow[] = [];
  for (const [key, arr] of groups) {
    const validated = arr.filter((s) => s.phalCard?.validationDetected).length;
    const scores = arr
      .map((s) => s.karmaScore)
      .filter((x): x is number => typeof x === "number");
    rows.push({
      key,
      sessions: arr.length,
      validationRate: Math.round((validated / arr.length) * 100),
      avgKarma: scores.length
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : undefined,
    });
  }
  return rows.sort((a, b) => b.sessions - a.sessions || b.validationRate - a.validationRate);
}

export function computeStats(
  sessions: AgentKarmaSession[],
  karmaEma: number | undefined,
  lastN = 12
): DashboardStats {
  const completed = sessions.filter((s) => s.status === "completed");
  const recent = completed.slice(-lastN);
  const n = recent.length;

  const validationCount = recent.filter((s) => s.phalCard?.validationDetected).length;
  const testsRunCount = recent.filter((s) =>
    s.phalCard?.commandsDetected?.some((c) => c.type === "Test")
  ).length;

  const outcomes = { ready: 0, needs: 0, highRisk: 0, informational: 0 };
  for (const s of recent) {
    switch (s.phalCard?.outcome) {
      case "Ready for Review":
        outcomes.ready++;
        break;
      case "Needs Review":
        outcomes.needs++;
        break;
      case "High Risk":
        outcomes.highRisk++;
        break;
      case "Informational":
        outcomes.informational++;
        break;
    }
  }

  // Consistency strip: a wider window than the score window, oldest→latest.
  const strip = completed.slice(-STREAK_WINDOW);
  const validationCells = strip.map(sessionToCell);
  const validatedFlags = strip.map((s) => !!s.phalCard?.validationDetected);
  const consistency = {
    validatedCount: validatedFlags.filter(Boolean).length,
    total: strip.length,
    ...runs(validatedFlags),
  };

  // Rolling validation rate (5-session moving window) → a smoothed trend line.
  const validationTrend = validatedFlags.map((_, i) => {
    const win = validatedFlags.slice(Math.max(0, i - 4), i + 1);
    return Math.round((win.filter(Boolean).length / win.length) * 100);
  });

  // Risk × validation: validation rate within each risk tier (the sharpest signal).
  const tiers: ("High" | "Medium" | "Low")[] = ["High", "Medium", "Low"];
  const riskWindow = completed.slice(-15);
  const riskValidation = tiers.map((tier) => {
    const inTier = riskWindow.filter((s) => s.dharmaCard?.riskLevel === tier);
    const validated = inTier.filter((s) => s.phalCard?.validationDetected).length;
    return {
      tier,
      total: inTier.length,
      validated,
      rate: inTier.length > 0 ? Math.round((validated / inTier.length) * 100) : 0,
    };
  });

  const last = recent[recent.length - 1];
  return {
    rollingKarma: karmaEma !== undefined ? Math.round(karmaEma) : undefined,
    lastTrend: last?.karmaTrend,
    sessionCount: completed.length,
    recentCount: n,
    validationRate: n > 0 ? Math.round((validationCount / n) * 100) : undefined,
    testsRunCount,
    scoreSeries: recent.map((s) => s.karmaScore ?? 0),
    outcomes,
    validationCells,
    consistency,
    riskValidation,
    validationTrend,
  };
}

/**
 * Validation heatmap: for each task type (rows) × each check (columns), how often you
 * ran that check. Reveals situational blind spots ("you skip tests on Refactoring").
 * Insight, not volume — every cell is a validation RATE, not a count of work.
 */
export function computeValidationHeatmap(
  sessions: AgentKarmaSession[],
  maxRows = 6
): { rows: { label: string; cells: { label: string; value: number | null; n: number }[] }[]; colLabels: string[] } {
  const completed = sessions.filter((s) => s.status === "completed");
  const groups = new Map<string, AgentKarmaSession[]>();
  for (const s of completed) {
    const arr = groups.get(s.taskType);
    if (arr) {
      arr.push(s);
    } else {
      groups.set(s.taskType, [s]);
    }
  }
  const ordered = [...groups.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, maxRows);
  const colLabels = ["Test", "Build", "Lint", "Type"];
  const checkFor: Record<string, ValidationCommandType> = {
    Test: "Test",
    Build: "Build",
    Lint: "Lint",
    Type: "Type Check",
  };
  const rows = ordered.map(([task, arr]) => ({
    label: task,
    cells: colLabels.map((col) => ({
      label: col,
      n: arr.length,
      value:
        arr.length === 0
          ? null
          : Math.round((arr.filter((s) => ranType(s, checkFor[col])).length / arr.length) * 100),
    })),
  }));
  return { rows, colLabels };
}
