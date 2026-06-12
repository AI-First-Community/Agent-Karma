import * as vscode from "vscode";
import { randomUUID } from "crypto";
import { LocalStore } from "../storage/localStore";
import { SessionManager } from "../core/sessionManager";
import { renderDashboardHtml } from "./dashboardHtml";
import { computeStats, computeValidationHabits, computeValidationHeatmap } from "./dashboardStats";
import { generateWeeklyReflection } from "../reflection/weeklyReflection";
import { assessReadiness, ReadinessSignals, ValidationReadiness } from "../collectors/validationReadiness";
import { scanReadinessSignals } from "../collectors/validationReadinessScan";
import { explainKarmaMove } from "../scoring/karmaExplain";
import { findSkills } from "../skills/skillFinder";
import { nudgeInstallState } from "../hooks/preCommitNudge";
import { highRiskWatchlist, scoreComposition, usageAttribution, computeRework } from "./insights";
import { readClaudeUsage } from "../collectors/claudeUsageScan";

/** A single read-only dashboard webview panel. */
export class DashboardPanel {
  private panel: vscode.WebviewPanel | undefined;
  private refreshTimer: ReturnType<typeof setTimeout> | undefined;
  /** Short-lived cache for the readiness scan (sync FS over many roots — rarely changes). */
  private readinessCache:
    | { root: string; at: number; signals: ReadinessSignals; readiness: ValidationReadiness }
    | undefined;

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
        // Allow only the Karma Card command to be triggered from a dashboard link;
        // the dashboard stays script-free otherwise.
        enableCommandUris: ["agentKarma.generateKarmaCard"],
        retainContextWhenHidden: false,
        localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, "media")],
      }
    );
    this.panel.onDidDispose(() => {
      this.panel = undefined;
    });
    this.render();
  }

  /**
   * Re-render if the panel is open. Debounced: this is called on every captured
   * event, and a render does full store reads + a multi-root readiness scan + a
   * full HTML rebuild — so bursts (e.g. an agent saving many files) coalesce into
   * one render on the trailing edge.
   */
  refresh(): void {
    if (!this.panel) {
      return;
    }
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }
    this.refreshTimer = setTimeout(() => {
      this.refreshTimer = undefined;
      this.render();
    }, 300);
  }

  /** Readiness scan, cached briefly (it's sync FS over root + nested package roots). */
  private getReadiness(
    root: string | undefined
  ): { signals: ReadinessSignals; readiness: ValidationReadiness } | undefined {
    if (!root) {
      return undefined;
    }
    const now = Date.now();
    if (this.readinessCache && this.readinessCache.root === root && now - this.readinessCache.at < 15000) {
      return this.readinessCache;
    }
    const signals = scanReadinessSignals(root);
    const readiness = assessReadiness(signals);
    this.readinessCache = { root, at: now, signals, readiness };
    return this.readinessCache;
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
    const claudeUsage =
      root && vscode.workspace.getConfiguration("agentKarma").get<boolean>("readClaudeUsage")
        ? readClaudeUsage(root) ?? undefined
        : undefined;
    const readinessResult = this.getReadiness(root);
    const signals = readinessResult?.signals;
    const readiness = readinessResult?.readiness;
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
      heatmap: computeValidationHeatmap(store.sessions),
      watchlist: highRiskWatchlist(store.sessions),
      scoreComposition: scoreComposition(store.sessions),
      claudeUsage,
      usageAttribution: claudeUsage
        ? usageAttribution(claudeUsage.timeline, store.sessions)
        : undefined,
      rework: computeRework(allEvents),
      active,
      activeEvents,
      lastCompleted,
      lastCompletedEvents,
      karmaMove,
      recent,
    });
  }

  dispose(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = undefined;
    }
    this.panel?.dispose();
  }
}
