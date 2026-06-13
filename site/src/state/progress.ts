// Local-first Dojo progress — no account, no cloud. Mirrors the extension's
// storage ethos: schema-versioned JSON in localStorage. Reset clears everything.
import type { KarmicMood } from "../engine/karma";

const KEY = "agentKarma.site.v1";

export interface ScenarioResult {
  bestKarma: number;
  foundAll: boolean;
  ts: number;
}
export interface SiteProgress {
  schemaVersion: 1;
  completed: Record<string, ScenarioResult>;
}

function empty(): SiteProgress {
  return { schemaVersion: 1, completed: {} };
}

export function load(): SiteProgress {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (p && p.schemaVersion === 1 && p.completed) return p;
    }
  } catch {
    /* ignore */
  }
  return empty();
}

export function save(p: SiteProgress): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

export function reset(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

/** Record a Dojo attempt; keeps the best score and any clean-sweep. */
export function record(id: string, karma: number, foundAll: boolean): SiteProgress {
  const p = load();
  const prev = p.completed[id];
  p.completed[id] = {
    bestKarma: Math.max(karma, prev?.bestKarma ?? 0),
    foundAll: foundAll || prev?.foundAll || false,
    ts: Date.now(),
  };
  save(p);
  return p;
}

export interface ProgressStats {
  completedCount: number;
  cleanCount: number;
  avgKarma: number;
  cleanRate: number;
  mood: KarmicMood;
  rank: string;
}

// Mirrors extension/src/cards/karmaCard.ts MOOD credentials (4 stable labels).
const RANK: Record<KarmicMood, string> = {
  luminous: "Luminous Validator",
  steady: "Steady Validator",
  forming: "Forming Validator",
  dim: "On the Path",
};

export function stats(p: SiteProgress = load()): ProgressStats {
  const results = Object.values(p.completed);
  const n = results.length;
  const cleanCount = results.filter((r) => r.foundAll).length;
  const avgKarma = n ? Math.round(results.reduce((s, r) => s + r.bestKarma, 0) / n) : 0;
  const cleanRate = n ? Math.round((cleanCount / n) * 100) : 0;
  // Same band logic the extension uses (scoring-model §3.4).
  const consistent = n >= 3 && cleanRate >= 60;
  const mood: KarmicMood =
    avgKarma >= 80 && consistent ? "luminous" : avgKarma >= 60 ? "steady" : avgKarma >= 40 ? "forming" : "dim";
  return { completedCount: n, cleanCount, avgKarma, cleanRate, mood, rank: RANK[mood] };
}
