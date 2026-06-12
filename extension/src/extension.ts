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
import { installHook, removeHook } from "./hooks/preCommitNudge";
import { StartSessionPanel } from "./panels/startSessionPanel";
import { generateWeeklyReflection } from "./reflection/weeklyReflection";
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

  const syncStatusBar = (): void => {
    const active = manager.getActiveSession();
    if (active) {
      statusBar.setRecording(active.startedAt);
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

  const endFlow = async (): Promise<void> => {
    if (!manager.hasActiveSession()) {
      void vscode.window.showInformationMessage("No active Agent Karma session to end.");
      return;
    }
    // End-of-session validation checklist: just tick what you ran. Anything we
    // already auto-detected is pre-checked, so you only add what we missed.
    const activeForEnd = manager.getActiveSession();
    const detected = new Set(
      store
        .loadEvents()
        .events.filter(
          (e) => e.sessionId === activeForEnd?.id && e.type === "validation.command"
        )
        .map((e) => String(e.data.commandType))
    );
    const checklistItems: (vscode.QuickPickItem & { type: ValidationCommandType })[] = (
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
    const picks = await vscode.window.showQuickPick(checklistItems, {
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

    // Git diff summary (counts only) + Phal Card, computed while the session is still active.
    const cwds = (vscode.workspace.workspaceFolders ?? []).map((f) => f.uri.fsPath);
    const gitSummary = await getGitDiffSummary(cwds);
    manager.finalizeActiveSession(gitSummary);

    // Optional, UNSCORED reflection.
    const outcome = await vscode.window.showQuickPick(
      ["Yes", "Partly", "No", "Skip"],
      { title: "Did the outcome match your intent? (optional — not scored)", ignoreFocusOut: true }
    );
    if (outcome && outcome !== "Skip") {
      manager.setReflectionForActiveSession({
        outcomeMatchedIntent: outcome.toLowerCase() as "yes" | "partly" | "no",
      });
    }

    const ended = manager.endSession();
    syncStatusBar();
    dashboard.refresh();
    void vscode.window.showInformationMessage(
      `Agent Karma session ended: ${ended?.title ?? ""}`
    );
  };

  const toggleFlow = async (): Promise<void> => {
    if (manager.hasActiveSession()) {
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

  context.subscriptions.push(
    vscode.commands.registerCommand("agentKarma.startSession", startFlow),
    vscode.commands.registerCommand("agentKarma.endSession", endFlow),
    vscode.commands.registerCommand(TOGGLE_COMMAND, toggleFlow),
    vscode.commands.registerCommand("agentKarma.showDashboard", () => dashboard.show()),
    vscode.commands.registerCommand("agentKarma.weeklyReflection", weeklyReflectionFlow),
    vscode.commands.registerCommand("agentKarma.addValidationCommand", addValidationFlow),
    vscode.commands.registerCommand("agentKarma.exportJson", () => exportFlow("json")),
    vscode.commands.registerCommand("agentKarma.exportMarkdown", () => exportFlow("markdown")),
    vscode.commands.registerCommand("agentKarma.deleteAllData", deleteFlow),
    vscode.commands.registerCommand("agentKarma.installPreCommitNudge", installNudgeFlow),
    vscode.commands.registerCommand("agentKarma.removePreCommitNudge", removeNudgeFlow),
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

  return { getStorageDir: () => store.dir, startSession: (meta) => doStart(meta) };
}

export function deactivate(): void {
  // No-op by design. State is flushed on every event, never on deactivate
  // (no guarantee it runs on crash/kill) — see docs/architecture.md §6.
}
