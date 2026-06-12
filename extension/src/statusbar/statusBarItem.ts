import * as vscode from "vscode";
import { formatElapsed } from "../utils/time";

/**
 * The one-click Status Bar control — the primary entry point for sessions.
 *
 * - Idle:      ▶ Agent Karma: Start
 * - Recording: ● Recording MM:SS — End   (timer derived from startedAt, 1 Hz)
 *
 * Clicking runs `toggleCommand` (start when idle, end when recording).
 */
export class StatusBarController {
  private readonly item: vscode.StatusBarItem;
  private timer: ReturnType<typeof setInterval> | undefined;

  constructor(toggleCommand: string) {
    this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    this.item.command = toggleCommand;
    this.setIdle();
    this.item.show();
  }

  setIdle(): void {
    this.stopTimer();
    this.item.text = "$(play) Agent Karma: Start";
    this.item.tooltip = "Start an Agent Karma session";
  }

  /** Ambient mode: continuously watching, grouped by day. */
  setAmbient(): void {
    this.stopTimer();
    this.item.text = "$(eye) Agent Karma · watching";
    this.item.tooltip = "Ambient mode — capturing your work by day. Click to open the dashboard.";
  }

  /** Show the recording state with a live MM:SS timer computed from startedAt. */
  setRecording(startedAtIso: string): void {
    this.stopTimer();
    const render = (): void => {
      this.item.text = `$(record) Recording ${formatElapsed(startedAtIso)} — End`;
      this.item.tooltip = "End the active Agent Karma session";
    };
    render();
    // 1 Hz is enough for MM:SS; elapsed is recomputed from startedAt each tick,
    // so sleep/suspend never drifts the displayed time.
    this.timer = setInterval(render, 1000);
  }

  private stopTimer(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  dispose(): void {
    this.stopTimer();
    this.item.dispose();
  }
}
