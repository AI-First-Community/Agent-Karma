import * as vscode from "vscode";
import { randomUUID } from "crypto";
import { LocalStore } from "../storage/localStore";
import { SessionManager } from "../core/sessionManager";
import { renderDashboardHtml } from "./dashboardHtml";
import { computeStats, computeValidationHabits } from "./dashboardStats";
import { generateWeeklyReflection } from "../reflection/weeklyReflection";
import { assessReadiness } from "../collectors/validationReadiness";
import { scanReadinessSignals } from "../collectors/validationReadinessScan";
import { explainKarmaMove } from "../scoring/karmaExplain";
import { findSkills } from "../skills/skillFinder";
import { nudgeInstallState } from "../hooks/preCommitNudge";

/** A single read-only dashboard webview panel. */
export class DashboardPanel {
  private panel: vscode.WebviewPanel | undefined;

  constructor(
    private readonly store: LocalStore,
    private readonly sessions: SessionManager,
    private readonly extensionUri: vscode.Uri
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
      {
        enableScripts: false,
        retainContextWhenHidden: false,
        localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, "media")],
      }
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
    const stats = computeStats(store.sessions, store.karmaEma);
    const reflection = generateWeeklyReflection(store.sessions, new Date().toISOString());
    const recent = store.sessions
      .filter((s) => s.status === "completed")
      .slice(-10)
      .reverse();
    const active = this.sessions.getActiveSession();
    const allEvents = this.store.loadEvents().events;
    const activeEvents = active
      ? allEvents.filter((e) => e.sessionId === active.id)
      : [];
    const lastCompleted = recent[0];
    const lastCompletedEvents = lastCompleted
      ? allEvents.filter((e) => e.sessionId === lastCompleted.id)
      : [];
    const prevCompleted = recent[1];
    const karmaMove =
      lastCompleted?.karmaScore !== undefined && prevCompleted?.karmaScore !== undefined
        ? explainKarmaMove(prevCompleted, lastCompleted)
        : undefined;
    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    const signals = root ? scanReadinessSignals(root) : undefined;
    const readiness = signals ? assessReadiness(signals) : undefined;
    const habits = computeValidationHabits(store.sessions);
    const suggestions =
      root && signals
        ? findSkills({
            recentCount: habits.recentCount,
            skipRates: habits.rates.map((r) => ({ type: r.type, skipRate: 100 - r.rate })),
            signals,
            preCommitInstallable: nudgeInstallState(root) === "installable",
          })
        : [];
    const fontUri = this.panel.webview
      .asWebviewUri(vscode.Uri.joinPath(this.extensionUri, "media", "fonts", "manrope.woff2"))
      .toString();
    this.panel.webview.html = renderDashboardHtml({
      nonce: randomUUID().replace(/-/g, ""),
      cspSource: this.panel.webview.cspSource,
      fontUri,
      stats,
      reflection,
      validationHabits: habits,
      readiness,
      suggestions,
      active,
      activeEvents,
      lastCompleted,
      lastCompletedEvents,
      karmaMove,
      recent,
    });
  }

  dispose(): void {
    this.panel?.dispose();
  }
}
