import { AgentKarmaSession } from "../core/types";

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
  };
}
