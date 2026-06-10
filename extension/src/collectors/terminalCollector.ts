import * as vscode from "vscode";
import { SessionManager } from "../core/sessionManager";
import { ValidationResult } from "../core/types";
import { toValidationData, asEventData } from "../privacy/privacyRules";
import { classifyCommand } from "../utils/commandClassifier";

/** Minimal shape of the 1.93+ shell-execution-end event (accessed defensively). */
interface ShellExecEndEvent {
  exitCode?: number;
  execution?: { commandLine?: { value?: string } };
}

/**
 * Captures validation commands (tests/build/lint/...), while a session is active.
 *
 * Two paths (specification §7):
 * - Automatic (best-effort): terminal shell integration (VS Code 1.93+). Accessed
 *   defensively so the extension still works on older VS Code; absent exit code →
 *   "unknown" (never "failed"). Non-validation commands ("Other") are ignored.
 * - Manual: logCommand() logs a command the user ran (always available).
 *
 * The raw command string is classified then discarded — only type + result persist.
 */
export class TerminalCollector {
  private readonly disposables: vscode.Disposable[] = [];

  constructor(private readonly manager: SessionManager) {
    const w = vscode.window as unknown as {
      onDidEndTerminalShellExecution?: (
        listener: (e: ShellExecEndEvent) => void
      ) => vscode.Disposable;
    };
    if (typeof w.onDidEndTerminalShellExecution === "function") {
      this.disposables.push(
        w.onDidEndTerminalShellExecution((e) => this.onShellExec(e))
      );
    }
  }

  /** Manually log a validation command. Returns true if recorded. */
  logCommand(rawCommand: string): boolean {
    return this.record(rawCommand, "unknown", "logged");
  }

  private onShellExec(e: ShellExecEndEvent): void {
    const cmd = e.execution?.commandLine?.value;
    if (!cmd) {
      return;
    }
    // Only record recognized validation commands automatically — not every shell command.
    if (classifyCommand(cmd) === "Other") {
      return;
    }
    const result: ValidationResult =
      e.exitCode === undefined ? "unknown" : e.exitCode === 0 ? "passed" : "failed";
    this.record(cmd, result, "observed");
  }

  private record(
    rawCommand: string,
    result: ValidationResult,
    source: "observed" | "logged"
  ): boolean {
    if (!this.manager.hasActiveSession()) {
      return false;
    }
    const data = toValidationData(rawCommand, result, source);
    return this.manager.recordForActiveSession("validation.command", asEventData(data));
  }

  dispose(): void {
    this.disposables.forEach((d) => d.dispose());
  }
}
