import * as vscode from "vscode";
import { SessionManager } from "../core/sessionManager";
import { LocalStore } from "../storage/localStore";
import { EventBus } from "../core/eventBus";
import { AgentKarmaSettings } from "../core/types";
import { toFileSavedData, asEventData } from "../privacy/privacyRules";
import { baseName } from "../utils/fileUtils";

/**
 * Captures file saves as metadata only, while a session is active.
 * - active-session-gated (nothing captured otherwise)
 * - real source files only (scheme "file", inside the workspace, not under .git)
 * - deduped per session (auto-save fires often)
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
      vscode.workspace.onDidSaveTextDocument((doc) => this.onSave(doc))
    );
    // Reset the per-session dedupe set when sessions start/end.
    const sub = bus.on((e) => {
      if (e.type === "session.started" || e.type === "session.ended") {
        this.seen.clear();
      }
    });
    this.disposables.push({ dispose: () => sub.dispose() });
  }

  private onSave(doc: vscode.TextDocument): void {
    if (!this.manager.hasActiveSession()) {
      return;
    }
    if (!this.getSettings().enabled) {
      return; // master switch off — no passive capture
    }
    if (doc.uri.scheme !== "file") {
      return;
    }
    if (!vscode.workspace.getWorkspaceFolder(doc.uri)) {
      return; // outside the workspace
    }
    const fsPath = doc.uri.fsPath;
    if (/[\\/]\.git[\\/]/.test(fsPath)) {
      return; // ignore git internals
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
