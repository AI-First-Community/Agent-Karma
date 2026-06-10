import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { SessionManager, PointerStore, SessionMeta } from "./sessionManager";
import { EventBus } from "./eventBus";
import { LocalStore } from "../storage/localStore";
import { ACTIVE_SESSION_POINTER_KEY, AgentKarmaEvent } from "./types";

/** In-memory Memento for tests. */
class FakePointer implements PointerStore {
  private map = new Map<string, string>();
  get(key: string): string | undefined {
    return this.map.get(key);
  }
  update(key: string, value: string | undefined): void {
    if (value === undefined) {
      this.map.delete(key);
    } else {
      this.map.set(key, value);
    }
  }
}

const META: SessionMeta = {
  title: "Fix login bug",
  aiTool: "Claude Code",
  taskType: "Bug Fix",
  intent: "fix the login failure and add a regression test",
};

describe("SessionManager", () => {
  let baseDir: string;
  let store: LocalStore;
  let bus: EventBus;
  let pointer: FakePointer;
  let clock: Date;
  let counter: number;

  function makeManager() {
    return new SessionManager(store, bus, pointer, {
      now: () => clock,
      id: () => `id-${++counter}`,
    });
  }

  beforeEach(() => {
    baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "agent-karma-sm-"));
    store = new LocalStore(baseDir);
    bus = new EventBus();
    pointer = new FakePointer();
    clock = new Date("2026-06-10T10:00:00.000Z");
    counter = 0;
  });

  afterEach(() => {
    fs.rmSync(baseDir, { recursive: true, force: true });
  });

  it("starts a session: persists it, sets the pointer, emits events", () => {
    const events: AgentKarmaEvent[] = [];
    bus.on((e) => events.push(e));
    const mgr = makeManager();

    const session = mgr.startSession(META);

    expect(session.status).toBe("active");
    expect(session.startedAt).toBe("2026-06-10T10:00:00.000Z");
    expect(mgr.getActiveSession()?.id).toBe(session.id);
    expect(pointer.get(ACTIVE_SESSION_POINTER_KEY)).toBe(session.id);
    expect(store.loadSessions().sessions).toHaveLength(1);
    expect(events.map((e) => e.type)).toEqual(["session.started", "intent.captured"]);
  });

  it("does not emit intent.captured for an empty intent", () => {
    const events: AgentKarmaEvent[] = [];
    bus.on((e) => events.push(e));
    makeManager().startSession({ ...META, intent: "   " });
    expect(events.map((e) => e.type)).toEqual(["session.started"]);
  });

  it("refuses to start a second session while one is active", () => {
    const mgr = makeManager();
    mgr.startSession(META);
    expect(() => mgr.startSession(META)).toThrow(/already active/i);
    expect(store.loadSessions().sessions).toHaveLength(1);
  });

  it("ends the active session: finalizes, clears the pointer, emits session.ended", () => {
    const mgr = makeManager();
    const started = mgr.startSession(META);
    clock = new Date("2026-06-10T10:25:00.000Z");

    const ended = mgr.endSession();

    expect(ended?.id).toBe(started.id);
    expect(ended?.status).toBe("completed");
    expect(ended?.endedAt).toBe("2026-06-10T10:25:00.000Z");
    expect(mgr.hasActiveSession()).toBe(false);
    expect(pointer.get(ACTIVE_SESSION_POINTER_KEY)).toBeUndefined();
    const stored = store.loadSessions().sessions[0];
    expect(stored.status).toBe("completed");
  });

  it("endSession returns undefined when nothing is active", () => {
    expect(makeManager().endSession()).toBeUndefined();
  });

  it("restores an active session after a simulated reload (not stale)", () => {
    const mgr1 = makeManager();
    const started = mgr1.startSession(META);

    // Simulate reload: brand-new manager, same store + pointer.
    clock = new Date("2026-06-10T10:05:00.000Z"); // 5 min later
    const mgr2 = makeManager();
    const restored = mgr2.restoreActiveSession(30);

    expect(restored?.session.id).toBe(started.id);
    expect(restored?.stale).toBe(false);
    expect(mgr2.hasActiveSession()).toBe(true);
  });

  it("flags a restored session as stale when idle past the threshold", () => {
    makeManager().startSession(META);
    clock = new Date("2026-06-10T10:45:00.000Z"); // 45 min later, threshold 30
    const restored = makeManager().restoreActiveSession(30);
    expect(restored?.stale).toBe(true);
  });

  it("clears a dangling pointer when the referenced session is gone/completed", () => {
    const mgr = makeManager();
    mgr.startSession(META);
    mgr.endSession(); // session now completed, pointer cleared
    // Force a dangling pointer to a completed session id:
    pointer.update(ACTIVE_SESSION_POINTER_KEY, store.loadSessions().sessions[0].id);

    const restored = makeManager().restoreActiveSession(30);
    expect(restored).toBeUndefined();
    expect(pointer.get(ACTIVE_SESSION_POINTER_KEY)).toBeUndefined();
  });
});
