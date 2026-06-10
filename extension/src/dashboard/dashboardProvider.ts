import * as vscode from "vscode";
import { randomUUID } from "crypto";
import { LocalStore } from "../storage/localStore";
import { SessionManager } from "../core/sessionManager";
import { renderDashboardHtml } from "./dashboardHtml";

/** A single read-only dashboard webview panel. */
export class DashboardPanel {
  private panel: vscode.WebviewPanel | undefined;

  constructor(
    private readonly store: LocalStore,
    private readonly sessions: SessionManager
  ) {}

  show(): void {
    if (this.panel) {
      this.panel.reveal();
      this.render();
      return;
    }
    this.panel = vscode.window.createWebviewPanel(
      "agentKarma.dashboard",
      "Agent Karma",
      vscode.ViewColumn.Active,
      { enableScripts: false, retainContextWhenHidden: false }
    );
    this.panel.onDidDispose(() => {
      this.panel = undefined;
    });
    this.render();
  }

  /** Re-render if the panel is open (called on session events). */
  refresh(): void {
    if (this.panel) {
      this.render();
    }
  }

  private render(): void {
    if (!this.panel) {
      return;
    }
    const store = this.store.loadSessions();
    const recent = store.sessions
      .filter((s) => s.status === "completed")
      .slice(-10)
      .reverse();
    const active = this.sessions.getActiveSession();
    const activeEvents = active
      ? this.store.loadEvents().events.filter((e) => e.sessionId === active.id)
      : [];
    this.panel.webview.html = renderDashboardHtml({
      nonce: randomUUID().replace(/-/g, ""),
      cspSource: this.panel.webview.cspSource,
      active,
      activeEvents,
      recent,
    });
  }

  dispose(): void {
    this.panel?.dispose();
  }
}
