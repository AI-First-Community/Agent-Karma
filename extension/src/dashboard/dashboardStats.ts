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
