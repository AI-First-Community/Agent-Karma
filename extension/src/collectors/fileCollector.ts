import * as vscode from "vscode";
import { SessionManager } from "../core/sessionManager";
import { LocalStore } from "../storage/localStore";
import { EventBus } from "../core/eventBus";
import { AgentKarmaSettings } from "../core/types";
import { toFileSavedData, asEventData } from "../privacy/privacyRules";
import { baseName, isIgnoredCapturePath } from "../utils/fileUtils";

/**
 * Captures file changes as metadata only, while a session is active.
 * - editor saves (`onDidSaveTextDocument`) AND — when `captureExternalFileChanges`
 *   is on — external writes via a filesystem watcher, so changes made by AI coding
 *   agents, the terminal, or other tools (which never fire an editor "save") are
 *   not invisible.
 * - active-session-gated (nothing captured otherwise)
 * - real source files only (scheme "file", inside the workspace; deps, build output
 *   and caches are skipped via `isIgnoredCapturePath`)
 * - deduped per session (saves + the watcher fire often; a file counts once)
 * - never reads or stores file content
 */
export class FileCollector {
  private readonly seen = new Set<string>();
  private readonly disposables: vscode.Disposable[] = [];

  constructor(
    private readonly manager: SessionManager,
    store: LocalStore,
    bus: EventBus,
    private readonly getSettings: () => AgentKarmaSettings = () => store.loadSettings()
  ) {
    this.disposables.push(
      vscode.workspace.onDidSaveTextDocument((doc) => this.onChange(doc.uri))
    );

    // External / agent / CLI writes never raise an editor save. A filesystem
    // watcher catches them; gated behind the captureExternalFileChanges setting.
    const watcher = vscode.workspace.createFileSystemWatcher("**/*");
    const onExternal = (uri: vscode.Uri): void => {
      if (this.getSettings().captureExternalFileChanges) {
        this.onChange(uri);
      }
    };
    watcher.onDidChange(onExternal);
    watcher.onDidCreate(onExternal);
    this.disposables.push(watcher);

    // Reset the per-session dedupe set when sessions start/end.
    const sub = bus.on((e) => {
      if (e.type === "session.started" || e.type === "session.ended") {
        this.seen.clear();
      }
    });
    this.disposables.push({ dispose: () => sub.dispose() });
  }

  private onChange(uri: vscode.Uri): void {
    if (!this.manager.hasActiveSession()) {
      return;
    }
    if (!this.getSettings().enabled) {
      return; // master switch off — no passive capture
    }
    if (uri.scheme !== "file") {
      return;
    }
    if (!vscode.workspace.getWorkspaceFolder(uri)) {
      return; // outside the workspace
    }
    const fsPath = uri.fsPath;
    if (isIgnoredCapturePath(fsPath)) {
      return; // .git, dependencies, build output, caches, generated/lock files
    }
    if (this.seen.has(fsPath)) {
      return;
    }
    this.seen.add(fsPath);

    const settings = this.getSettings();
    const data = toFileSavedData(baseName(fsPath), fsPath, settings.storeFullFilePath);
    this.manager.recordForActiveSession("file.saved", asEventData(data));
  }

  dispose(): void {
    this.disposables.forEach((d) => d.dispose());
  }
}
