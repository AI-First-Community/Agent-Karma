import * as vscode from "vscode";

// Agent Karma — local-first AI-coding validation & self-awareness coach.
//
// Phase 0: foundation scaffold only. The session lifecycle, status bar control,
// commands, collectors, scoring, and dashboard are wired in Release 0.1+ per
// docs/implementation-plan.md. Activation is intentionally cheap (onStartupFinished).

export function activate(context: vscode.ExtensionContext): void {
  // Keep activation minimal. Heavy work (store load, git, dashboard) is deferred
  // to first use in later releases.
  context.subscriptions.push(
    new vscode.Disposable(() => {
      /* placeholder for future teardown */
    })
  );
  console.log("Agent Karma activated");
}

export function deactivate(): void {
  // No-op by design. Persistence is flush-on-event and never relies on
  // deactivate() running (no guarantee on crash/kill) — see architecture §6.
}
