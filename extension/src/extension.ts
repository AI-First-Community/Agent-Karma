import * as vscode from "vscode";
import { LocalStore } from "./storage/localStore";
import { EventBus } from "./core/eventBus";
import { SessionManager } from "./core/sessionManager";
import { StatusBarController } from "./statusbar/statusBarItem";
import { DashboardPanel } from "./dashboard/dashboardProvider";
import { FileCollector } from "./collectors/fileCollector";
import { TerminalCollector } from "./collectors/terminalCollector";
import { getGitDiffSummary } from "./collectors/gitCollector";
import { AI_TOOLS, TASK_TYPES } from "./core/types";

// Agent Karma — local-first AI-coding validation & self-awareness coach.
// Release 0.1 (foundation): manual sessions via a one-click status bar, atomic
// local JSON storage, survive-reload/crash recovery, and a basic dashboard.

const TOGGLE_COMMAND = "agentKarma.toggleSession";
const LAST_TOOL_KEY = "agentKarma.lastAiTool";
const LAST_TASK_KEY = "agentKarma.lastTaskType";

/** Put the last-used value first so it is the default selection. */
function lastFirst(items: readonly string[], last: string | undefined): string[] {
  if (!last || !items.includes(last)) {
    return [...items];
  }
  return [last, ...items.filter((i) => i !== last)];
}

export function activate(context: vscode.ExtensionContext): void {
  const store = new LocalStore(context.globalStorageUri.fsPath);
  const bus = new EventBus();
  const manager = new SessionManager(store, bus, context.globalState);
  const statusBar = new StatusBarController(TOGGLE_COMMAND);
  const dashboard = new DashboardPanel(store, manager);
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

  const startFlow = async (): Promise<void> => {
    if (manager.hasActiveSession()) {
      void vscode.window.showInformationMessage(
        "Agent Karma is already recording a session. End it before starting a new one."
      );
      return;
    }
    const title = await vscode.window.showInputBox({
      title: "Agent Karma — Start Session",
      prompt: "What are you working on?",
      ignoreFocusOut: true,
    });
    if (title === undefined) {
      return; // cancelled
    }
    const aiTool = await vscode.window.showQuickPick(
      lastFirst(AI_TOOLS, context.globalState.get<string>(LAST_TOOL_KEY)),
      { title: "Which AI tool are you using?", ignoreFocusOut: true }
    );
    if (aiTool === undefined) {
      return;
    }
    const taskType = await vscode.window.showQuickPick(
      lastFirst(TASK_TYPES, context.globalState.get<string>(LAST_TASK_KEY)),
      { title: "What kind of task is this?", ignoreFocusOut: true }
    );
    if (taskType === undefined) {
      return;
    }
    const intent = await vscode.window.showInputBox({
      title: "Intent (optional)",
      prompt: "What are you trying to accomplish? (optional — press Enter to skip)",
      ignoreFocusOut: true,
    });
    if (intent === undefined) {
      return; // cancelled (empty string is allowed and means "skipped")
    }

    try {
      manager.startSession({
        title: title.trim() || "Untitled session",
        aiTool,
        taskType,
        intent: intent.trim(),
      });
    } catch (err) {
      void vscode.window.showWarningMessage(
        err instanceof Error ? err.message : "Could not start the session."
      );
      return;
    }
    // Remember the choices to pre-select them next time.
    void context.globalState.update(LAST_TOOL_KEY, aiTool);
    void context.globalState.update(LAST_TASK_KEY, taskType);
    syncStatusBar();
    dashboard.refresh();
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
    // End-of-session validation prompt: invite logging the commands you ran (not a yes/no).
    let addMore = true;
    while (addMore) {
      const choice = await vscode.window.showInformationMessage(
        "Did you run tests / build / lint this session? Add them so they count.",
        "Add command",
        "Done"
      );
      if (choice === "Add command") {
        await addValidationFlow();
      } else {
        addMore = false;
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
      await startFlow();
    }
  };

  context.subscriptions.push(
    vscode.commands.registerCommand("agentKarma.startSession", startFlow),
    vscode.commands.registerCommand("agentKarma.endSession", endFlow),
    vscode.commands.registerCommand(TOGGLE_COMMAND, toggleFlow),
    vscode.commands.registerCommand("agentKarma.showDashboard", () => dashboard.show()),
    vscode.commands.registerCommand("agentKarma.addValidationCommand", addValidationFlow),
    statusBar,
    dashboard,
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
          endFlow();
        } else {
          syncStatusBar();
        }
      });
  }
}

export function deactivate(): void {
  // No-op by design. State is flushed on every event, never on deactivate
  // (no guarantee it runs on crash/kill) — see docs/architecture.md §6.
}
