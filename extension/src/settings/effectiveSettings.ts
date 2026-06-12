import * as vscode from "vscode";
import { AgentKarmaSettings } from "../core/types";
import { LocalStore } from "../storage/localStore";

/**
 * The effective settings used at runtime.
 *
 * VS Code configuration (`agentKarma.*`) is the source of truth for the user-facing
 * toggles; the on-disk `settings.json` (via {@link LocalStore.loadSettings}) supplies
 * defaults and any non-promoted fields. `captureTerminalOutput` stays forced off — a
 * Prime Directive no setting can override (already enforced by loadSettings()).
 *
 * Lives in the extension layer (imports `vscode`); core/* stays VS Code-free.
 */
export function getEffectiveSettings(store: LocalStore): AgentKarmaSettings {
  const file = store.loadSettings();
  const cfg = vscode.workspace.getConfiguration("agentKarma");
  const bool = (key: string, fallback: boolean): boolean => cfg.get<boolean>(key) ?? fallback;
  const num = (key: string, fallback: number): number => cfg.get<number>(key) ?? fallback;

  return {
    ...file,
    enabled: bool("enabled", file.enabled),
    captureTerminalCommands: bool("captureTerminalCommands", file.captureTerminalCommands),
    capturePromptText: bool("capturePromptText", file.capturePromptText),
    enableGitDiffSummary: bool("enableGitDiffSummary", file.enableGitDiffSummary),
    storeFullFilePath: bool("storeFullFilePath", file.storeFullFilePath),
    idleEndMinutes: num("idleEndMinutes", file.idleEndMinutes),
    captureTerminalOutput: false,
  };
}
