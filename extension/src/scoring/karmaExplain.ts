import { KARMA_RULES, KarmaRule } from "./karmaRules";

// "Why did my Karma move?" — explain a score change between two sessions purely in
// terms of which named rules were gained or lost. Works on historical sessions too:
// we recover the earned rules from the persisted reason strings (label-prefix match),
// so it needs no new stored field.

export interface SessionScoreLike {
  karmaScore?: number;
  karmaReasons?: string[];
}

export interface KarmaMove {
  prevScore: number;
  currScore: number;
  delta: number;
  /** Rules earned now but not in the previous session. */
  gained: KarmaRule[];
  /** Rules earned previously but not now. */
  lost: KarmaRule[];
  summary: string;
}

/** Which rule ids a session earned, recovered from its reason strings. */
export function earnedRuleIds(session: SessionScoreLike): Set<string> {
  const reasons = session.karmaReasons ?? [];
  const ids = new Set<string>();
  for (const rule of KARMA_RULES) {
    if (reasons.some((r) => r.startsWith(`${rule.label} (+`))) {
      ids.add(rule.id);
    }
  }
  return ids;
}

function list(rules: KarmaRule[]): string {
  return rules.map((r) => r.label.replace(/ —.*$/, "")).join(", ");
}

export function explainKarmaMove(prev: SessionScoreLike, curr: SessionScoreLike): KarmaMove {
  const prevScore = prev.karmaScore ?? 0;
  const currScore = curr.karmaScore ?? 0;
  const delta = currScore - prevScore;

  const prevIds = earnedRuleIds(prev);
  const currIds = earnedRuleIds(curr);
  const gained = KARMA_RULES.filter((r) => currIds.has(r.id) && !prevIds.has(r.id));
  const lost = KARMA_RULES.filter((r) => prevIds.has(r.id) && !currIds.has(r.id));

  let summary: string;
  if (delta > 0) {
    summary = `Karma rose ${delta} — you added: ${list(gained)}`;
    if (lost.length) {
      summary += ` (but dropped: ${list(lost)})`;
    }
    summary += ".";
  } else if (delta < 0) {
    summary = `Karma fell ${-delta} — you dropped: ${list(lost)}`;
    if (gained.length) {
      summary += ` (you did add: ${list(gained)})`;
    }
    summary += ".";
  } else if (gained.length || lost.length) {
    summary = `Karma held steady, though what you validated shifted (added ${list(gained) || "nothing"}, dropped ${list(lost) || "nothing"}).`;
  } else {
    summary = "No change since your last session — same validation pattern.";
  }

  return { prevScore, currScore, delta, gained, lost, summary };
}
