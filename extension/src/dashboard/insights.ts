import { AgentKarmaSession } from "../core/types";
import { KARMA_RULES } from "../scoring/karmaRules";

// Deeper, derived insight — all from existing sessions, no new capture, no surveillance.

// 1. High-risk watchlist — risky work you changed but never validated. A to-do list,
//    not a statistic: the literal sessions worth going back to check.
export interface WatchItem {
  title: string;
  taskType: string;
}

export function highRiskWatchlist(sessions: AgentKarmaSession[], max = 5): WatchItem[] {
  return sessions
    .filter(
      (s) =>
        s.status === "completed" &&
        s.dharmaCard?.riskLevel === "High" &&
        !s.phalCard?.validationDetected
    )
    .slice(-max)
    .reverse()
    .map((s) => ({ title: s.title, taskType: s.taskType }));
}

// 2. Skip-by-task — the single worst (task type × check) combination, so the gap is
//    situational ("you skip tests on Refactoring"), not just a flat rate.
export interface HeatRowLike {
  label: string;
  cells: { label: string; value: number | null; n: number }[];
}
export interface SkipCallout {
  task: string;
  check: string;
  rate: number;
  n: number;
}

export function worstTaskCheck(rows: HeatRowLike[]): SkipCallout | null {
  let worst: SkipCallout | null = null;
  for (const r of rows) {
    for (const c of r.cells) {
      if (c.value === null || c.n < 2) {
        continue;
      }
      if (!worst || c.value < worst.rate) {
        worst = { task: r.label, check: c.label, rate: c.value, n: c.n };
      }
    }
  }
  // Only surface a genuine gap.
  return worst && worst.rate < 60 ? worst : null;
}

// 3. Score composition — how much of your Karma is REAL verification (tests/build/lint)
//    vs. the near-free points (git captured, prompt hygiene). Interrogates the number.
export type CompositionCategory = "real" | "cheap";
export interface CompositionSeg {
  id: string;
  label: string;
  points: number;
  category: CompositionCategory;
}
export interface ScoreComposition {
  segs: CompositionSeg[];
  total: number;
  realPct: number;
}

const REAL_RULES = new Set(["tests-run", "tests-passed", "build-clean", "lint-clean", "test-alongside"]);

export function scoreComposition(sessions: AgentKarmaSession[], lastN = 12): ScoreComposition {
  const recent = sessions.filter((s) => s.status === "completed").slice(-lastN);
  const points = new Map<string, number>();
  for (const s of recent) {
    for (const reason of s.karmaReasons ?? []) {
      const rule = KARMA_RULES.find((r) => reason.startsWith(`${r.label} (+`));
      if (!rule) {
        continue;
      }
      const m = reason.match(/\(\+([\d.]+)\)/);
      const p = m ? parseFloat(m[1]) : 0;
      points.set(rule.id, (points.get(rule.id) ?? 0) + p);
    }
  }
  const segs: CompositionSeg[] = KARMA_RULES.filter((r) => (points.get(r.id) ?? 0) > 0).map((r) => ({
    id: r.id,
    label: r.label,
    points: Math.round(points.get(r.id) ?? 0),
    category: REAL_RULES.has(r.id) ? "real" : "cheap",
  }));
  const total = segs.reduce((a, b) => a + b.points, 0);
  const realPts = segs.filter((s) => s.category === "real").reduce((a, b) => a + b.points, 0);
  return { segs, total, realPct: total > 0 ? Math.round((realPts / total) * 100) : 0 };
}
