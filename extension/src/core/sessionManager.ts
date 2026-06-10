import { randomUUID } from "crypto";
import {
  AgentKarmaSession,
  AgentKarmaEvent,
  AgentKarmaEventType,
  GitDiffSummary,
  ReflectionNote,
  ACTIVE_SESSION_POINTER_KEY,
} from "./types";
import { EventBus } from "./eventBus";
import { LocalStore } from "../storage/localStore";
import { scorePrompt } from "../scoring/promptScorer";
import { generateDharmaCard } from "../cards/dharmaCard";
import { generatePhalCard } from "../cards/phalCard";
import { asEventData } from "../privacy/privacyRules";

/** Metadata captured when a session starts. */
export interface SessionMeta {
  title: string;
  aiTool: string;
  taskType: string;
  intent: string;
}

/** Minimal subset of vscode.Memento — lets us unit-test without the vscode API. */
export interface PointerStore {
  get(key: string): string | undefined;
  update(key: string, value: string | undefined): void | Thenable<void>;
}

export interface RestoreResult {
  session: AgentKarmaSession;
  /** True if the restored session has been idle past the threshold (forgot-to-end). */
  stale: boolean;
}

export interface SessionManagerOptions {
  now?: () => Date;
  id?: () => string;
  pointerKey?: string;
}

/**
 * Owns the single, global-singleton active session.
 *
 * Survive-reload / crash recovery (Spike A): the active session id is mirrored in a
 * PointerStore (globalState Memento) and the full record is flushed to LocalStore on
 * every transition. On activate, restoreActiveSession() rebuilds in-memory state from
 * disk — never relying on deactivate() (no guarantee on crash/kill).
 */
export class SessionManager {
  private active?: AgentKarmaSession;
  private readonly now: () => Date;
  private readonly id: () => string;
  private readonly pointerKey: string;

  constructor(
    private readonly store: LocalStore,
    private readonly bus: EventBus,
    private readonly pointer: PointerStore,
    opts: SessionManagerOptions = {}
  ) {
    this.now = opts.now ?? (() => new Date());
    this.id = opts.id ?? (() => randomUUID());
    this.pointerKey = opts.pointerKey ?? ACTIVE_SESSION_POINTER_KEY;
  }

  getActiveSession(): AgentKarmaSession | undefined {
    return this.active;
  }

  hasActiveSession(): boolean {
    return this.active !== undefined;
  }

  /** Start a session. Throws if one is already active (single-singleton rule). */
  startSession(meta: SessionMeta): AgentKarmaSession {
    if (this.active) {
      throw new Error("A session is already active. End it before starting a new one.");
    }

    const promptHint = scorePrompt(meta.intent);
    const dharmaCard = generateDharmaCard(
      { title: meta.title, aiTool: meta.aiTool, taskType: meta.taskType, intent: meta.intent },
      promptHint
    );

    const session: AgentKarmaSession = {
      id: this.id(),
      title: meta.title,
      aiTool: meta.aiTool,
      taskType: meta.taskType,
      intent: meta.intent,
      startedAt: this.now().toISOString(),
      status: "active",
      promptHintScore: promptHint.score,
      promptHintLabel: promptHint.label,
      dharmaCard,
    };

    const store = this.store.loadSessions();
    store.sessions.push(session);
    this.store.saveSessions(store);

    this.active = session;
    void this.pointer.update(this.pointerKey, session.id);

    this.record("session.started", session.id, {});
    if (meta.intent.trim().length > 0) {
      this.record("intent.captured", session.id, { intent: meta.intent });
    }
    this.record("prompt.scored", session.id, {
      score: promptHint.score,
      label: promptHint.label,
    });
    this.record("dharma.generated", session.id, {});
    return session;
  }

  /** End the active session. Returns the finalized session, or undefined if none active. */
  endSession(): AgentKarmaSession | undefined {
    if (!this.active) {
      return undefined;
    }
    const ended: AgentKarmaSession = {
      ...this.active,
      endedAt: this.now().toISOString(),
      status: "completed",
    };
    this.persistSession(ended);
    this.record("session.ended", ended.id, {});

    this.active = undefined;
    void this.pointer.update(this.pointerKey, undefined);
    return ended;
  }

  /**
   * Rebuild in-memory state after a reload/restart. Returns the restored session
   * plus whether it is stale (idle past idleEndMinutes → prompt resume-or-finalize).
   * Returns undefined if there is nothing to restore (and clears a dangling pointer).
   */
  restoreActiveSession(idleEndMinutes: number): RestoreResult | undefined {
    const id = this.pointer.get(this.pointerKey);
    if (!id) {
      return undefined;
    }
    const store = this.store.loadSessions();
    const session = store.sessions.find((s) => s.id === id && s.status === "active");
    if (!session) {
      void this.pointer.update(this.pointerKey, undefined);
      return undefined;
    }
    this.active = session;
    return { session, stale: this.isStale(session, idleEndMinutes) };
  }

  /**
   * Record an event against the active session (no-op if none is active).
   * Used by the passive collectors (file saves, validation commands).
   * Returns true if recorded.
   */
  recordForActiveSession(
    type: AgentKarmaEventType,
    data: Record<string, unknown>
  ): boolean {
    if (!this.active) {
      return false;
    }
    this.record(type, this.active.id, data);
    return true;
  }

  /**
   * On session end: attach the git diff summary, generate the (provisional) Phal
   * Card from the session's events, and record the corresponding events.
   * Call BEFORE endSession() so the active session still exists.
   */
  attachGitAndPhal(gitSummary: GitDiffSummary): void {
    if (!this.active) {
      return;
    }
    this.active.gitDiffSummary = gitSummary;
    this.record("git.diff.summary", this.active.id, asEventData(gitSummary));

    const events = this.store.loadEvents().events.filter((e) => e.sessionId === this.active!.id);
    this.active.phalCard = generatePhalCard({
      dharmaCard: this.active.dharmaCard,
      events,
    });
    this.record("phal.generated", this.active.id, {});
    this.persistSession(this.active);
  }

  /** Store an optional, UNSCORED reflection note for the active session. */
  setReflectionForActiveSession(reflection: ReflectionNote): void {
    if (!this.active) {
      return;
    }
    this.active.reflection = reflection;
    this.record("outcome.reported", this.active.id, asEventData(reflection));
    this.persistSession(this.active);
  }

  // --- internals ---

  /** Replace the stored copy of a session (matched by id). */
  private persistSession(session: AgentKarmaSession): void {
    const store = this.store.loadSessions();
    const idx = store.sessions.findIndex((s) => s.id === session.id);
    if (idx >= 0) {
      store.sessions[idx] = session;
    } else {
      store.sessions.push(session);
    }
    this.store.saveSessions(store);
  }

  /** Persist an event to the event store AND emit it to in-process subscribers. */
  private record(
    type: AgentKarmaEventType,
    sessionId: string,
    data: Record<string, unknown>
  ): void {
    const event: AgentKarmaEvent = {
      id: this.id(),
      sessionId,
      type,
      timestamp: this.now().toISOString(),
      data,
    };
    const events = this.store.loadEvents();
    events.events.push(event);
    this.store.saveEvents(events);
    this.bus.emit(event);
  }

  /** Idle = (now - last event timestamp, or startedAt if none) exceeds the threshold. */
  private isStale(session: AgentKarmaSession, idleEndMinutes: number): boolean {
    const events = this.store.loadEvents().events.filter((e) => e.sessionId === session.id);
    const lastTs = events.reduce(
      (max, e) => (e.timestamp > max ? e.timestamp : max),
      session.startedAt
    );
    const idleMs = this.now().getTime() - new Date(lastTs).getTime();
    return idleMs > idleEndMinutes * 60_000;
  }
}
