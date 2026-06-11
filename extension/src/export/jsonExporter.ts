import { AgentKarmaSession, AgentKarmaEvent, SCHEMA_VERSION } from "../core/types";

// JSON export (specification §12). The session + its events are already metadata
// only (no source content, no terminal output, no raw command strings), so the
// export carries the developer's own data verbatim and nothing more.

export interface SessionExport {
  schemaVersion: number;
  exportedAt: string;
  session: AgentKarmaSession;
  events: AgentKarmaEvent[];
}

export function buildSessionExport(
  session: AgentKarmaSession,
  events: AgentKarmaEvent[],
  exportedAt: string
): SessionExport {
  return {
    schemaVersion: SCHEMA_VERSION,
    exportedAt,
    session,
    events: events.filter((e) => e.sessionId === session.id),
  };
}

export function toJson(
  session: AgentKarmaSession,
  events: AgentKarmaEvent[],
  exportedAt: string
): string {
  return JSON.stringify(buildSessionExport(session, events, exportedAt), null, 2);
}
