/**
 * Format elapsed time since `startedAtIso` as MM:SS (or H:MM:SS past an hour).
 * Elapsed is always derived from the start timestamp (never an incrementing
 * counter), so it stays correct across sleep/suspend and reload. Clock skew that
 * would produce a negative value is clamped to zero.
 */
export function formatElapsed(startedAtIso: string, now: Date = new Date()): string {
  const ms = Math.max(0, now.getTime() - new Date(startedAtIso).getTime());
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number): string => String(n).padStart(2, "0");
  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`;
}
