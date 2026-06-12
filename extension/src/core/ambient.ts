// Pure helpers for ambient (continuous, per-day) mode. The vscode wiring lives in
// extension.ts; the grouping decisions are pure and unit-tested here.

/** The day key (YYYY-MM-DD) an ambient session belongs to. */
export function ambientDayKey(iso: string): string {
  return iso.slice(0, 10);
}

/** A friendly title for an ambient day-session. */
export function ambientTitle(dayKey: string): string {
  return `Ambient · ${dayKey}`;
}

/**
 * Should the current active session be rolled over to a new ambient day?
 * Only ambient sessions roll over; a manual session is left untouched.
 */
export function ambientShouldRollover(
  active: { ambient?: boolean; startedAt: string } | undefined,
  todayKey: string
): boolean {
  return !!active?.ambient && ambientDayKey(active.startedAt) !== todayKey;
}

/** Whether we should auto-start an ambient session right now. */
export function ambientShouldStart(
  ambientOn: boolean,
  active: { ambient?: boolean; startedAt: string } | undefined,
  todayKey: string
): boolean {
  if (!ambientOn) {
    return false;
  }
  if (!active) {
    return true; // nothing active → start today's ambient session
  }
  return ambientShouldRollover(active, todayKey); // active ambient from another day → roll over
}
