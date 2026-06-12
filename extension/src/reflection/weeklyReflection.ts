import { AgentKarmaSession } from "../core/types";

// Weekly reflection (vision.md — the "growth" layer). Pure: looks at the recent
// window of completed sessions and surfaces ONE plain-language, coaching nudge —
// the single most useful thing, self-comparative, never shaming. Coaching, not a
// report card.

export interface WeeklyReflection {
  sessionCount: number;
  validatedCount: number;
  avgKarma?: number;
  summary: string;
  /** The one coaching line. */
  nudge: string;
  tone: "encourage" | "suggest" | "neutral";
}

export function generateWeeklyReflection(
  sessions: AgentKarmaSession[],
  nowIso: string,
  windowDays = 7
): WeeklyReflection {
  const now = new Date(nowIso).getTime();
  const windowMs = windowDays * 24 * 60 * 60 * 1000;
  const recent = sessions.filter(
    (s) => s.status === "completed" && now - new Date(s.startedAt).getTime() <= windowMs
  );
  const n = recent.length;

  const validatedCount = recent.filter((s) => s.phalCard?.validationDetected).length;
  const scores = recent
    .map((s) => s.karmaScore)
    .filter((x): x is number => typeof x === "number");
  const avgKarma = scores.length
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : undefined;

  // Sessions that changed something but logged no validation (excluding the
  // legitimately Informational ones, e.g. docs).
  const noValidation = recent.filter(
    (s) => s.phalCard && !s.phalCard.validationDetected && s.phalCard.outcome !== "Informational"
  );
  const highRiskNoVal = recent.filter(
    (s) => s.dharmaCard?.riskLevel === "High" && !s.phalCard?.validationDetected
  );
  const bugFixNoTest = recent.filter(
    (s) => s.dharmaCard?.intentType === "Bug Fix" && (s.phalCard?.testFilesChanged ?? 0) === 0
  );

  const summary =
    n === 0
      ? `No sessions in the last ${windowDays} days.`
      : `${n} session${n === 1 ? "" : "s"} · validated ${validatedCount}/${n}${
          avgKarma !== undefined ? ` · avg Karma ${avgKarma}` : ""
        }.`;

  let nudge: string;
  let tone: WeeklyReflection["tone"];

  if (n === 0) {
    nudge = "Start a session next time you code with AI — even one gives you something to reflect on.";
    tone = "neutral";
  } else if (n < 2) {
    nudge = "Just getting started — a couple more sessions and your patterns will start to show.";
    tone = "neutral";
  } else if (highRiskNoVal.length > 0) {
    const k = highRiskNoVal.length;
    nudge = `${k} high-risk session${k === 1 ? "" : "s"} (security / migration / devops) logged no validation — those are the riskiest to leave unchecked.`;
    tone = "suggest";
  } else if (noValidation.length >= Math.ceil(n / 2)) {
    nudge = `${noValidation.length} of ${n} sessions changed code but logged no tests / build / lint — try validating before you commit.`;
    tone = "suggest";
  } else if (bugFixNoTest.length >= 2) {
    nudge = `${bugFixNoTest.length} bug-fix sessions added no test — a quick regression test would raise your confidence (and your Karma).`;
    tone = "suggest";
  } else if (validatedCount === n) {
    nudge = "You validated every session this week — deliberate, trustworthy work. Keep it up.";
    tone = "encourage";
  } else {
    nudge = `You validated ${validatedCount} of ${n} sessions — solid. Nudging that toward every session is the next step.`;
    tone = "encourage";
  }

  return { sessionCount: n, validatedCount, avgKarma, summary, nudge, tone };
}
