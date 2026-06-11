import * as vscode from "vscode";
import { randomUUID } from "crypto";
import { renderStartForm } from "./startSessionHtml";
import { SessionMeta } from "../core/sessionManager";

/** A small webview form for starting a session (replaces the sequential prompts). */
export class StartSessionPanel {
  private panel: vscode.WebviewPanel | undefined;

  constructor(private readonly onSubmit: (meta: SessionMeta) => void) {}

  show(
    aiTools: readonly string[],
    taskTypes: readonly string[],
    lastTool?: string,
    lastTask?: string
  ): void {
    if (!this.panel) {
      this.panel = vscode.window.createWebviewPanel(
        "agentKarma.startSession",
        "Agent Karma — Start Session",
        vscode.ViewColumn.Active,
        { enableScripts: true, retainContextWhenHidden: false }
      );
      this.panel.onDidDispose(() => {
        this.panel = undefined;
      });
      this.panel.webview.onDidReceiveMessage((msg: { type?: string; payload?: SessionMeta }) => {
        if (msg?.type === "start" && msg.payload) {
          this.onSubmit(msg.payload);
          this.panel?.dispose();
        } else if (msg?.type === "cancel") {
          this.panel?.dispose();
        }
      });
    } else {
      this.panel.reveal();
    }
    this.panel.webview.html = renderStartForm({
      nonce: randomUUID().replace(/-/g, ""),
      cspSource: this.panel.webview.cspSource,
      aiTools,
      taskTypes,
      lastTool,
      lastTask,
    });
  }

  dispose(): void {
    this.panel?.dispose();
  }
}
