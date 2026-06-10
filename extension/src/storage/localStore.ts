import * as fs from "fs";
import * as path from "path";
import {
  AgentKarmaStore,
  AgentKarmaEventStore,
  AgentKarmaSettings,
  DEFAULT_SETTINGS,
  SCHEMA_VERSION,
} from "../core/types";

/**
 * Local JSON store under `<baseDir>/agent-karma-data/`.
 *
 * Design notes:
 * - Takes a base directory (the extension passes context.globalStorageUri.fsPath),
 *   so this module has NO dependency on the vscode API and is unit-testable.
 * - Atomic writes: write-to-temp-then-rename, so sessions.json / events.json never
 *   tear under a crash mid-flush (architecture §6).
 * - Fail safe: all I/O is wrapped; a corrupt file is backed up and a safe default
 *   is returned instead of throwing — the extension must never crash on storage.
 * - Privacy: this layer only persists what it is given; callers are responsible for
 *   passing metadata only (never source content / terminal output / raw commands).
 */
export class LocalStore {
  readonly dir: string;

  static readonly SESSIONS_FILE = "sessions.json";
  static readonly EVENTS_FILE = "events.json";
  static readonly SETTINGS_FILE = "settings.json";

  constructor(baseDir: string) {
    this.dir = path.join(baseDir, "agent-karma-data");
  }

  // --- Sessions (sessions.json → AgentKarmaStore) ---

  loadSessions(): AgentKarmaStore {
    return this.readJson<AgentKarmaStore>(LocalStore.SESSIONS_FILE, {
      schemaVersion: SCHEMA_VERSION,
      sessions: [],
    });
  }

  saveSessions(store: AgentKarmaStore): boolean {
    return this.writeJson(LocalStore.SESSIONS_FILE, store);
  }

  // --- Events (events.json → AgentKarmaEventStore) ---

  loadEvents(): AgentKarmaEventStore {
    return this.readJson<AgentKarmaEventStore>(LocalStore.EVENTS_FILE, {
      schemaVersion: SCHEMA_VERSION,
      events: [],
    });
  }

  saveEvents(store: AgentKarmaEventStore): boolean {
    return this.writeJson(LocalStore.EVENTS_FILE, store);
  }

  // --- Settings (settings.json → AgentKarmaSettings) ---

  /**
   * Missing keys fall back to defaults. `captureTerminalOutput` is forced off
   * regardless of what is on disk — a Prime Directive that no setting can override.
   */
  loadSettings(): AgentKarmaSettings {
    const loaded = this.readJson<Partial<AgentKarmaSettings>>(
      LocalStore.SETTINGS_FILE,
      {}
    );
    return { ...DEFAULT_SETTINGS, ...loaded, captureTerminalOutput: false };
  }

  saveSettings(settings: AgentKarmaSettings): boolean {
    return this.writeJson(LocalStore.SETTINGS_FILE, {
      ...settings,
      captureTerminalOutput: false,
    });
  }

  // --- Delete everything (the privacy promise made tangible) ---

  /** Wipes the entire data directory. Returns true on success. */
  deleteAll(): boolean {
    try {
      fs.rmSync(this.dir, { recursive: true, force: true });
      return true;
    } catch {
      return false;
    }
  }

  // --- internals ---

  private ensureDir(): void {
    fs.mkdirSync(this.dir, { recursive: true });
  }

  private readJson<T>(file: string, fallback: T): T {
    const full = path.join(this.dir, file);
    try {
      if (!fs.existsSync(full)) {
        return fallback;
      }
      return JSON.parse(fs.readFileSync(full, "utf8")) as T;
    } catch {
      // Corrupt/unreadable file: preserve it for inspection, never crash.
      this.backupCorrupt(full);
      return fallback;
    }
  }

  private writeJson(file: string, data: unknown): boolean {
    const full = path.join(this.dir, file);
    const tmp = `${full}.tmp`;
    try {
      this.ensureDir();
      fs.writeFileSync(tmp, JSON.stringify(data, null, 2), "utf8");
      fs.renameSync(tmp, full); // atomic on the same filesystem
      return true;
    } catch {
      // Best-effort cleanup of the temp file; report failure to the caller.
      try {
        if (fs.existsSync(tmp)) {
          fs.rmSync(tmp, { force: true });
        }
      } catch {
        /* ignore */
      }
      return false;
    }
  }

  private backupCorrupt(full: string): void {
    try {
      if (fs.existsSync(full)) {
        fs.renameSync(full, `${full}.corrupt`);
      }
    } catch {
      /* ignore — recovery is best-effort */
    }
  }
}
