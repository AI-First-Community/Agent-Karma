import * as vscode from "vscode";
import { LocalStore } from "./storage/localStore";
import { EventBus } from "./core/eventBus";
import { SessionManager } from "./core/sessionManager";
import { StatusBarController } from "./statusbar/statusBarItem";
import { DashboardPanel } from "./dashboard/dashboardProvider";
import { FileCollector } from "./collectors/fileCollector";
import { TerminalCollector } from "./collectors/terminalCollector";
import { getGitDiffSummary } from "./collectors/gitCollector";
import { toJson } from "./export/jsonExporter";
import { toMarkdown } from "./export/markdownExporter";
import { installHook, removeHook, nudgeInstallState } from "./hooks/preCommitNudge";
import { StartSessionPanel } from "./panels/startSessionPanel";
import { generateWeeklyReflection } from "./reflection/weeklyReflection";
import { ambientDayKey, ambientTitle, ambientShouldStart } from "./core/ambient";
import { assessReadiness } from "./collectors/validationReadiness";
import { scanReadinessSignals } from "./collectors/validationReadinessScan";
import { explainKarmaMove } from "./scoring/karmaExplain";
import { registerChatParticipant } from "./chat/agentKarmaParticipant";
import { SummaryData } from "./chat/chatRouter";
import { findSkills } from "./skills/skillFinder";
import { computeValidationHabits, computeStats } from "./dashboard/dashboardStats";
import { karmicMessage } from "./dashboard/karmicMessage";
import { renderKarmaCardSvg, renderKarmaCardPrintHtml } from "./cards/karmaCard";
import { randomUUID } from "crypto";
import { SessionMeta } from "./core/sessionManager";
import { AI_TOOLS, TASK_TYPES, AgentKarmaSession, ValidationCommandType } from "./core/types";

// Agent Karma — local-first AI-coding validation & self-awareness coach.
// Release 0.1 (foundation): manual sessions via a one-click status bar, atomic
// local JSON storage, survive-reload/crash recovery, and a basic dashboard.

const TOGGLE_COMMAND = "agentKarma.toggleSession";

/** Small API returned from activate() for integration tests / automation. */
export interface AgentKarmaApi {
  getStorageDir(): string;
  startSession(meta: SessionMeta): void;
}
const LAST_TOOL_KEY = "agentKarma.lastAiTool";
const LAST_TASK_KEY = "agentKarma.lastTaskType";

export function activate(context: vscode.ExtensionContext): AgentKarmaApi {
  const store = new LocalStore(context.globalStorageUri.fsPath);
  const bus = new EventBus();
  const manager = new SessionManager(store, bus, context.globalState);
  const statusBar = new StatusBarController(TOGGLE_COMMAND);
  const dashboard = new DashboardPanel(store, manager, context.extensionUri);
  const fileCollector = new FileCollector(manager, store, bus);
  const terminalCollector = new TerminalCollector(manager);

  const AMBIENT_KEY = "agentKarma.ambientMode";
  const ambientOn = (): boolean => context.globalState.get<boolean>(AMBIENT_KEY) === true;

  const syncStatusBar = (): void => {
    const active = manager.getActiveSession();
    if (active?.ambient) {
      statusBar.setAmbient();
    } else if (active) {
      statusBar.setRecording(active.startedAt);
    } else if (ambientOn()) {
      statusBar.setAmbient();
    } else {
      statusBar.setIdle();
    }
  };

  // Actually start a session from the form's values (also the test/automation entry point).
  const doStart = (meta: SessionMeta): void => {
    if (manager.hasActiveSession()) {
      void vscode.window.showInformationMessage("Agent Karma is already recording a session.");
      return;
    }
    try {
      manager.startSession({
        title: meta.title.trim() || "Untitled session",
        aiTool: meta.aiTool,
        taskType: meta.taskType,
        intent: meta.intent.trim(),
      });
    } catch (err) {
      void vscode.window.showWarningMessage(
        err instanceof Error ? err.message : "Could not start the session."
      );
      return;
    }
    // Remember the choices to pre-select them next time.
    void context.globalState.update(LAST_TOOL_KEY, meta.aiTool);
    void context.globalState.update(LAST_TASK_KEY, meta.taskType);
    syncStatusBar();
    dashboard.refresh();
    void vscode.window.showInformationMessage(`Agent Karma session started: ${meta.title}`);
  };

  const startPanel = new StartSessionPanel(doStart);

  // Opens the Start Session form (the config UI). The form posts back to doStart.
  const startFlow = (): void => {
    if (manager.hasActiveSession()) {
      void vscode.window.showInformationMessage(
        "Agent Karma is already recording a session. End it before starting a new one."
      );
      return;
    }
    startPanel.show(
      AI_TOOLS,
      TASK_TYPES,
      context.globalState.get<string>(LAST_TOOL_KEY),
      context.globalState.get<string>(LAST_TASK_KEY)
    );
  };

  const addValidationFlow = async (): Promise<void> => {
    if (!manager.hasActiveSession()) {
      void vscode.window.showInformationMessage(
        "Start an Agent Karma session first, then log the validation commands you ran."
      );
      return;
    }
    const cmd = await vscode.window.showInputBox({
      title: "Agent Karma — Add Validation Command",
      prompt: "Which validation command did you run? (e.g. npm test, npm run build, npm run lint)",
      ignoreFocusOut: true,
    });
    if (cmd === undefined || cmd.trim().length === 0) {
      return;
    }
    terminalCollector.logCommand(cmd.trim());
    dashboard.refresh();
    void vscode.window.showInformationMessage(`Logged validation: ${cmd.trim()}`);
  };

  // The end-of-session validation checklist (interactive): just tick what you ran.
  const validationChecklist = async (): Promise<void> => {
    const active = manager.getActiveSession();
    const detected = new Set(
      store
        .loadEvents()
        .events.filter((e) => e.sessionId === active?.id && e.type === "validation.command")
        .map((e) => String(e.data.commandType))
    );
    const items: (vscode.QuickPickItem & { type: ValidationCommandType })[] = (
      [
        { label: "Tests", type: "Test" },
        { label: "Build", type: "Build" },
        { label: "Lint", type: "Lint" },
        { label: "Type check", type: "Type Check" },
      ] as { label: string; type: ValidationCommandType }[]
    ).map((it) => ({
      label: it.label,
      type: it.type,
      description: detected.has(it.type) ? "auto-detected ✓" : undefined,
      picked: detected.has(it.type),
    }));
    const picks = await vscode.window.showQuickPick(items, {
      canPickMany: true,
      title: "Which validation did you run this session?",
      placeHolder: "Tick all you ran (auto-detected are pre-checked) — or leave empty if none",
    });
    if (picks) {
      for (const p of picks) {
        if (!detected.has(p.type)) {
          terminalCollector.logValidationType(p.type);
        }
      }
    }
  };

  // Finalize + end the active session. interactive = ask the checklist + reflection
  // (manual end); non-interactive = unattended (ambient day-rollover / toggle-off).
  const finishActiveSession = async (interactive: boolean): Promise<void> => {
    if (!manager.hasActiveSession()) {
      return;
    }
    if (interactive) {
      await validationChecklist();
    }
    const cwds = (vscode.workspace.workspaceFolders ?? []).map((f) => f.uri.fsPath);
    const gitSummary = await getGitDiffSummary(cwds);
    manager.finalizeActiveSession(gitSummary);

    if (interactive) {
      const outcome = await vscode.window.showQuickPick(["Yes", "Partly", "No", "Skip"], {
        title: "Did the outcome match your intent? (optional — not scored)",
        ignoreFocusOut: true,
      });
      if (outcome && outcome !== "Skip") {
        manager.setReflectionForActiveSession({
          outcomeMatchedIntent: outcome.toLowerCase() as "yes" | "partly" | "no",
        });
      }
    }

    const ended = manager.endSession();
    syncStatusBar();
    dashboard.refresh();
    if (interactive) {
      void vscode.window.showInformationMessage(`Agent Karma session ended: ${ended?.title ?? ""}`);
    }
  };

  const endFlow = async (): Promise<void> => {
    if (!manager.hasActiveSession()) {
      void vscode.window.showInformationMessage("No active Agent Karma session to end.");
      return;
    }
    await finishActiveSession(true);
  };

  // Ambient mode: ensure today's auto-managed session exists, rolling over at midnight.
  let ambientBusy = false;
  const ensureAmbientDaySession = async (): Promise<void> => {
    if (!ambientOn() || ambientBusy) {
      return;
    }
    const today = ambientDayKey(new Date().toISOString());
    const active = manager.getActiveSession();
    if (active && !active.ambient) {
      return; // a manual session is active — leave it alone
    }
    if (!ambientShouldStart(true, active, today)) {
      return;
    }
    ambientBusy = true;
    try {
      if (active?.ambient) {
        await finishActiveSession(false); // roll the previous day over
      }
      manager.startSession({
        title: ambientTitle(today),
        aiTool: "Various",
        taskType: "Other",
        intent: "",
        ambient: true,
      });
      syncStatusBar();
      dashboard.refresh();
    } finally {
      ambientBusy = false;
    }
  };

  const toggleAmbientFlow = async (): Promise<void> => {
    const next = !ambientOn();
    await context.globalState.update(AMBIENT_KEY, next);
    if (next) {
      await ensureAmbientDaySession();
      void vscode.window.showInformationMessage(
        "Ambient mode ON (experimental) — captures saves + validation grouped by day, with no intent. " +
          "A focused session you start yourself captures your intent and scores more meaningfully."
      );
    } else {
      if (manager.getActiveSession()?.ambient) {
        await finishActiveSession(false);
      }
      syncStatusBar();
      void vscode.window.showInformationMessage("Ambient mode OFF.");
    }
  };

  const toggleClaudeUsageFlow = async (): Promise<void> => {
    const cfg = vscode.workspace.getConfiguration("agentKarma");
    const now = cfg.get<boolean>("readClaudeUsage") ?? false;
    await cfg.update("readClaudeUsage", !now, vscode.ConfigurationTarget.Global);
    dashboard.refresh();
    void vscode.window.showInformationMessage(
      !now
        ? "Agent Karma: local AI usage is ON — reading token metadata from Claude Code's local logs (no network, no API key). Open the dashboard to see it."
        : "Agent Karma: local AI usage is OFF."
    );
  };

  const toggleFlow = async (): Promise<void> => {
    const active = manager.getActiveSession();
    if (active?.ambient) {
      dashboard.show(); // ambient sessions roll over by day, not by a click
    } else if (active) {
      await endFlow();
    } else {
      startFlow();
    }
  };

  const exportFlow = async (format: "json" | "markdown"): Promise<void> => {
    const sessions = store.loadSessions().sessions;
    const target: AgentKarmaSession | undefined =
      manager.getActiveSession() ?? sessions[sessions.length - 1];
    if (!target) {
      void vscode.window.showInformationMessage("No Agent Karma session to export yet.");
      return;
    }
    const allEvents = store.loadEvents().events;
    const ext = format === "json" ? "json" : "md";
    const content =
      format === "json"
        ? toJson(target, allEvents, new Date().toISOString())
        : toMarkdown(target, allEvents);

    const folder = vscode.workspace.workspaceFolders?.[0]?.uri;
    const defaultName = `agent-karma-session-${target.id}.${ext}`;
    const defaultUri = folder ? vscode.Uri.joinPath(folder, defaultName) : undefined;
    const uri = await vscode.window.showSaveDialog({
      defaultUri,
      filters: format === "json" ? { JSON: ["json"] } : { Markdown: ["md"] },
    });
    if (!uri) {
      return;
    }
    await vscode.workspace.fs.writeFile(uri, Buffer.from(content, "utf8"));
    void vscode.window.showInformationMessage(`Agent Karma: exported to ${uri.fsPath}`);
  };

  const cardPageHtml = (svg: string, nonce: string): string => {
    const csp = `default-src 'none'; style-src 'nonce-${nonce}' 'unsafe-inline'`;
    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" />
      <meta http-equiv="Content-Security-Policy" content="${csp}" />
      <style nonce="${nonce}">
        body { margin: 0; background: #0a0c10; display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 28px; font-family: -apple-system, 'Segoe UI', sans-serif; color: #8b949e; }
        .card { width: 100%; max-width: 920px; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 48px rgba(0,0,0,0.55); }
        .card svg { width: 100%; height: auto; display: block; }
        .tip { font-size: 13px; text-align: center; }
      </style></head>
      <body><div class="card">${svg}</div>
      <div class="tip">Screenshot to share, or use “Save as SVG” to export. Generated locally — nothing leaves your machine.</div>
      </body></html>`;
  };

  const generateKarmaCardFlow = async (): Promise<void> => {
    const s = store.loadSessions();
    const stats = computeStats(s.sessions, s.karmaEma);
    const cardInput = {
      mood: karmicMessage(stats).mood,
      karma: stats.rollingKarma,
      validationRate: stats.validationRate,
      bestStreak: stats.consistency?.bestRun,
      sessions: stats.sessionCount,
      dateLabel: new Date().toISOString().slice(0, 10),
    };
    const svg = renderKarmaCardSvg(cardInput);
    const panel = vscode.window.createWebviewPanel("agentKarma.card", "Karma Card", vscode.ViewColumn.Active, {
      enableScripts: false,
      retainContextWhenHidden: false,
    });
    panel.webview.html = cardPageHtml(svg, randomUUID().replace(/-/g, ""));
    const folder = vscode.workspace.workspaceFolders?.[0]?.uri;

    const choice = await vscode.window.showInformationMessage(
      "Your Karma Card is ready. Save it as an image to share, or as a printable PDF.",
      "Save as SVG",
      "Printable PDF"
    );
    if (choice === "Save as SVG") {
      const uri = await vscode.window.showSaveDialog({
        defaultUri: folder ? vscode.Uri.joinPath(folder, "karma-card.svg") : undefined,
        filters: { "SVG image": ["svg"] },
        saveLabel: "Save Karma Card",
      });
      if (uri) {
        await vscode.workspace.fs.writeFile(uri, Buffer.from(svg, "utf8"));
        void vscode.window.showInformationMessage(`Karma Card saved to ${uri.fsPath}`);
      }
    } else if (choice === "Printable PDF") {
      const uri = await vscode.window.showSaveDialog({
        defaultUri: folder ? vscode.Uri.joinPath(folder, "karma-card.html") : undefined,
        filters: { "Printable HTML": ["html"] },
        saveLabel: "Save printable card",
      });
      if (uri) {
        await vscode.workspace.fs.writeFile(uri, Buffer.from(renderKarmaCardPrintHtml(cardInput), "utf8"));
        await vscode.env.openExternal(uri);
        void vscode.window.showInformationMessage(
          "Opened your Karma Card in the browser — press ⌘P / Ctrl+P → “Save as PDF”."
        );
      }
    }
  };

  const resetHistoryFlow = async (): Promise<void> => {
    const confirm = await vscode.window.showWarningMessage(
      "Reset Karma history? This clears all sessions and your Karma trend (a fresh start) but keeps your settings. It cannot be undone.",
      { modal: true },
      "Reset History"
    );
    if (confirm !== "Reset History") {
      return;
    }
    manager.discardActiveSession();
    store.resetHistory();
    syncStatusBar();
    dashboard.refresh();
    void vscode.window.showInformationMessage("Agent Karma history reset — sessions and Karma trend cleared. Your settings are kept.");
  };

  const deleteFlow = async (): Promise<void> => {
    const confirm = await vscode.window.showWarningMessage(
      "Delete ALL Agent Karma data? This permanently removes every session, event, and setting stored on this machine. It cannot be undone.",
      { modal: true },
      "Delete Everything"
    );
    if (confirm !== "Delete Everything") {
      return;
    }
    manager.discardActiveSession();
    store.deleteAll();
    syncStatusBar();
    dashboard.refresh();
    void vscode.window.showInformationMessage("All Agent Karma data has been deleted.");
  };

  const installNudgeFlow = (): void => {
    const folder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!folder) {
      void vscode.window.showInformationMessage("Open a git repository folder first.");
      return;
    }
    const res = installHook(folder, store.dir);
    if (res.ok) {
      void vscode.window.showInformationMessage(
        "Agent Karma pre-commit nudge installed (opt-in, non-blocking). Remove it any time with 'Remove Pre-Commit Nudge'."
      );
    } else {
      void vscode.window.showWarningMessage(`Agent Karma: ${res.reason}`);
    }
  };

  const checkReadinessFlow = async (): Promise<void> => {
    const folder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!folder) {
      void vscode.window.showInformationMessage("Open a workspace folder to check validation readiness.");
      return;
    }
    const r = assessReadiness(scanReadinessSignals(folder));
    dashboard.show(); // the full breakdown lives in the "Can you validate?" panel
    if (!r.topGap) {
      void vscode.window.showInformationMessage(`Agent Karma — ${r.summary}`);
      return;
    }
    // If the missing net is the pre-commit hook (and we can install it), offer to.
    const canInstallNudge =
      r.topGap.key === "preCommit" && nudgeInstallState(folder) === "installable";
    const action = canInstallNudge ? "Install nudge" : undefined;
    const choice = await vscode.window.showInformationMessage(
      `Agent Karma — ${r.summary} Biggest gap: ${r.topGap.label}.`,
      ...(action ? [action] : [])
    );
    if (choice === action) {
      installNudgeFlow();
    }
  };

  const findValidationGapsFlow = async (): Promise<void> => {
    const folder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!folder) {
      void vscode.window.showInformationMessage("Open a workspace folder to find validation gaps.");
      return;
    }
    const habits = computeValidationHabits(store.loadSessions().sessions);
    const suggestions = findSkills({
      recentCount: habits.recentCount,
      skipRates: habits.rates.map((r) => ({ type: r.type, skipRate: 100 - r.rate })),
      signals: scanReadinessSignals(folder),
      preCommitInstallable: nudgeInstallState(folder) === "installable",
    });
    dashboard.show();
    if (suggestions.length === 0) {
      void vscode.window.showInformationMessage(
        "Agent Karma — your validation setup looks solid. Nothing to suggest right now."
      );
      return;
    }
    const top = suggestions[0];
    if (top.action.kind === "install-precommit") {
      const choice = await vscode.window.showInformationMessage(
        `Agent Karma — ${top.title}. ${top.rationale}`,
        "Install nudge"
      );
      if (choice === "Install nudge") {
        installNudgeFlow();
      }
    } else {
      void vscode.window.showInformationMessage(
        `Agent Karma — ${top.title}. ${top.rationale}  Steps: ${top.action.steps.join(" → ")}`
      );
    }
  };

  const whyKarmaMovedFlow = (): void => {
    const completed = store
      .loadSessions()
      .sessions.filter((s) => s.status === "completed" && s.karmaScore !== undefined);
    if (completed.length < 2) {
      void vscode.window.showInformationMessage(
        "Agent Karma: complete at least two scored sessions to compare your Karma."
      );
      dashboard.show();
      return;
    }
    const curr = completed[completed.length - 1];
    const prev = completed[completed.length - 2];
    const move = explainKarmaMove(prev, curr);
    void vscode.window.showInformationMessage(`Agent Karma — ${move.summary}`);
    dashboard.show();
  };

  const weeklyReflectionFlow = (): void => {
    const reflection = generateWeeklyReflection(
      store.loadSessions().sessions,
      new Date().toISOString()
    );
    void vscode.window.showInformationMessage(`Agent Karma — this week: ${reflection.nudge}`);
    dashboard.show();
  };

  const removeNudgeFlow = (): void => {
    const folder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!folder) {
      return;
    }
    const res = removeHook(folder);
    void (res.ok
      ? vscode.window.showInformationMessage("Agent Karma pre-commit nudge removed.")
      : vscode.window.showWarningMessage(`Agent Karma: ${res.reason}`));
  };

  // @agentkarma chat surface: /verify logs a validation (covers browser/copy-paste AI
  // with no IDE trail); /summary reflects your latest Karma. Feature-guarded inside.
  const recordValidationFromChat = (
    type: ValidationCommandType,
    result: "passed" | "failed"
  ): { ok: boolean; sessionTitle?: string } => {
    let active = manager.getActiveSession();
    if (!active) {
      const today = ambientDayKey(new Date().toISOString());
      active = manager.startSession({
        title: ambientTitle(today),
        aiTool: "Various",
        taskType: "Other",
        intent: "",
        ambient: true,
      });
      syncStatusBar();
    }
    const ok = manager.recordForActiveSession("validation.command", {
      commandType: type,
      result,
      source: "logged",
    });
    dashboard.refresh();
    return { ok, sessionTitle: active?.title };
  };

  const getSummaryData = (): SummaryData => {
    const sessions = store.loadSessions().sessions;
    const lastScored = [...sessions]
      .reverse()
      .find((s) => s.status === "completed" && s.karmaScore !== undefined);
    const reflection = generateWeeklyReflection(sessions, new Date().toISOString());
    const folder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    const readiness = folder ? assessReadiness(scanReadinessSignals(folder)) : undefined;
    return {
      lastTitle: lastScored?.title,
      lastScore: lastScored?.karmaScore,
      lastLabel: lastScored?.karmaScoreLabel,
      lastReasons: lastScored?.karmaReasons,
      reflectionNudge: reflection.nudge,
      readinessSummary: readiness?.summary,
      readinessTopGap: readiness?.topGap?.label,
    };
  };

  registerChatParticipant(context, {
    recordValidation: recordValidationFromChat,
    getSummaryData,
  });

  context.subscriptions.push(
    vscode.commands.registerCommand("agentKarma.startSession", startFlow),
    vscode.commands.registerCommand("agentKarma.endSession", endFlow),
    vscode.commands.registerCommand(TOGGLE_COMMAND, toggleFlow),
    vscode.commands.registerCommand("agentKarma.showDashboard", () => dashboard.show()),
    vscode.commands.registerCommand("agentKarma.weeklyReflection", weeklyReflectionFlow),
    vscode.commands.registerCommand("agentKarma.whyKarmaMoved", whyKarmaMovedFlow),
    vscode.commands.registerCommand("agentKarma.addValidationCommand", addValidationFlow),
    vscode.commands.registerCommand("agentKarma.exportJson", () => exportFlow("json")),
    vscode.commands.registerCommand("agentKarma.exportMarkdown", () => exportFlow("markdown")),
    vscode.commands.registerCommand("agentKarma.generateKarmaCard", generateKarmaCardFlow),
    vscode.commands.registerCommand("agentKarma.resetHistory", resetHistoryFlow),
    vscode.commands.registerCommand("agentKarma.deleteAllData", deleteFlow),
    vscode.commands.registerCommand("agentKarma.checkValidationReadiness", checkReadinessFlow),
    vscode.commands.registerCommand("agentKarma.findValidationGaps", findValidationGapsFlow),
    vscode.commands.registerCommand("agentKarma.installPreCommitNudge", installNudgeFlow),
    vscode.commands.registerCommand("agentKarma.removePreCommitNudge", removeNudgeFlow),
    vscode.commands.registerCommand("agentKarma.toggleAmbientMode", toggleAmbientFlow),
    vscode.commands.registerCommand("agentKarma.toggleClaudeUsage", toggleClaudeUsageFlow),
    // Ambient mode: a save is the trigger to ensure today's session exists / roll over.
    vscode.workspace.onDidSaveTextDocument(() => {
      void ensureAmbientDaySession();
    }),
    statusBar,
    dashboard,
    startPanel,
    fileCollector,
    terminalCollector
  );

  // Keep the status bar + dashboard in sync as sessions start/end.
  const subscription = bus.on(() => {
    syncStatusBar();
    dashboard.refresh();
  });
  context.subscriptions.push({ dispose: () => subscription.dispose() });

  // Survive-reload / crash recovery: rebuild any active session from disk.
  const settings = store.loadSettings();
  const restored = manager.restoreActiveSession(settings.idleEndMinutes);
  syncStatusBar();
  if (restored?.stale) {
    void vscode.window
      .showWarningMessage(
        `Agent Karma: a session ("${restored.session.title}") was left recording. Resume or end it?`,
        "Resume",
        "End"
      )
      .then((choice) => {
        if (choice === "End") {
          void endFlow();
        } else {
          syncStatusBar();
        }
      });
  }

  // If ambient mode is on, make sure today's session exists (and roll over a
  // session left running from a previous day).
  void ensureAmbientDaySession();

  // First-run offer: the pre-commit nudge is where validation actually matters —
  // make it present (not buried in the palette). Asked once, only in a git repo.
  const NUDGE_PROMPTED_KEY = "agentKarma.nudgePrompted";
  const repo0 = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (
    repo0 &&
    !context.globalState.get<boolean>(NUDGE_PROMPTED_KEY) &&
    nudgeInstallState(repo0) === "installable"
  ) {
    void context.globalState.update(NUDGE_PROMPTED_KEY, true);
    void vscode.window
      .showInformationMessage(
        "Agent Karma can remind you to validate AI-assisted changes right before you commit — locally, and it never blocks the commit.",
        "Add the reminder",
        "Not now"
      )
      .then((choice) => {
        if (choice === "Add the reminder") {
          installNudgeFlow();
        }
      });
  }

  return { getStorageDir: () => store.dir, startSession: (meta) => doStart(meta) };
}

export function deactivate(): void {
  // No-op by design. State is flushed on every event, never on deactivate
  // (no guarantee it runs on crash/kill) — see docs/architecture.md §6.
}
