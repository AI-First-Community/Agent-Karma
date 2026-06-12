import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { LocalStore } from "./localStore";
import { AgentKarmaStore, DEFAULT_SETTINGS, SCHEMA_VERSION } from "../core/types";

describe("LocalStore", () => {
  let baseDir: string;
  let store: LocalStore;

  beforeEach(() => {
    baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "agent-karma-test-"));
    store = new LocalStore(baseDir);
  });

  afterEach(() => {
    fs.rmSync(baseDir, { recursive: true, force: true });
  });

  it("returns an empty default store when nothing is saved yet", () => {
    const loaded = store.loadSessions();
    expect(loaded).toEqual({ schemaVersion: SCHEMA_VERSION, sessions: [] });
  });

  it("round-trips a sessions store", () => {
    const data: AgentKarmaStore = {
      schemaVersion: SCHEMA_VERSION,
      sessions: [
        {
          id: "s1",
          title: "Fix login bug",
          aiTool: "Claude Code",
          taskType: "Bug Fix",
          intent: "fix the login failure",
          startedAt: "2026-06-10T10:00:00.000Z",
          status: "active",
        },
      ],
      karmaEma: 64,
    };
    expect(store.saveSessions(data)).toBe(true);
    expect(store.loadSessions()).toEqual(data);
  });

  it("round-trips an events store", () => {
    const events = {
      schemaVersion: SCHEMA_VERSION,
      events: [
        {
          id: "e1",
          sessionId: "s1",
          type: "session.started" as const,
          timestamp: "2026-06-10T10:00:00.000Z",
          data: {},
        },
      ],
    };
    expect(store.saveEvents(events)).toBe(true);
    expect(store.loadEvents()).toEqual(events);
  });

  it("recovers from a corrupt file by backing it up and returning the default", () => {
    fs.mkdirSync(store.dir, { recursive: true });
    const sessionsPath = path.join(store.dir, LocalStore.SESSIONS_FILE);
    fs.writeFileSync(sessionsPath, "{ this is not valid json", "utf8");

    const loaded = store.loadSessions();
    expect(loaded).toEqual({ schemaVersion: SCHEMA_VERSION, sessions: [] });
    // the corrupt file is preserved for inspection, not silently destroyed
    expect(fs.existsSync(`${sessionsPath}.corrupt`)).toBe(true);
  });

  it("returns default settings when none exist and forces captureTerminalOutput off", () => {
    const settings = store.loadSettings();
    expect(settings).toEqual(DEFAULT_SETTINGS);
    expect(settings.captureTerminalOutput).toBe(false);
  });

  it("never enables captureTerminalOutput even if true is on disk", () => {
    fs.mkdirSync(store.dir, { recursive: true });
    fs.writeFileSync(
      path.join(store.dir, LocalStore.SETTINGS_FILE),
      JSON.stringify({ captureTerminalOutput: true, idleEndMinutes: 15 }),
      "utf8"
    );
    const settings = store.loadSettings();
    expect(settings.captureTerminalOutput).toBe(false);
    // other on-disk values still merge over defaults
    expect(settings.idleEndMinutes).toBe(15);
    expect(settings.enabled).toBe(DEFAULT_SETTINGS.enabled);
  });

  it("does not leave a .tmp file behind after a successful write", () => {
    store.saveSessions({ schemaVersion: SCHEMA_VERSION, sessions: [] });
    const tmp = path.join(store.dir, `${LocalStore.SESSIONS_FILE}.tmp`);
    expect(fs.existsSync(tmp)).toBe(false);
  });

  it("deleteAll wipes the data directory", () => {
    store.saveSessions({ schemaVersion: SCHEMA_VERSION, sessions: [] });
    expect(fs.existsSync(store.dir)).toBe(true);
    expect(store.deleteAll()).toBe(true);
    expect(fs.existsSync(store.dir)).toBe(false);
  });

  it("resetHistory clears sessions and events but keeps settings", () => {
    store.saveSessions({ schemaVersion: SCHEMA_VERSION, karmaEma: 72, sessions: [{ id: "s1" } as never] });
    store.saveEvents({ schemaVersion: SCHEMA_VERSION, events: [{ id: "e1" } as never] });
    store.saveSettings({ ...DEFAULT_SETTINGS, idleEndMinutes: 99 });

    expect(store.resetHistory()).toBe(true);

    const sessions = store.loadSessions();
    expect(sessions.sessions).toEqual([]);
    expect(sessions.karmaEma).toBeUndefined();
    expect(store.loadEvents().events).toEqual([]);
    // settings preserved
    expect(store.loadSettings().idleEndMinutes).toBe(99);
  });
});
