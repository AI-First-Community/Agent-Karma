import * as vscode from "vscode";
import { ValidationCommandType } from "../core/types";
import {
  parseChatCommand,
  formatSummary,
  formatVerify,
  helpText,
  SummaryData,
} from "./chatRouter";

// Thin vscode glue for the @agentkarma chat participant. The Chat API stabilised in
// VS Code 1.90; we feature-guard so older hosts degrade silently rather than throw on
// activation. No language model is used — the handler streams plain markdown — so this
// surface stays fully local and no-network.

export interface ChatDeps {
  recordValidation(
    type: ValidationCommandType,
    result: "passed" | "failed"
  ): { ok: boolean; sessionTitle?: string };
  getSummaryData(): SummaryData;
}

// Minimal structural types for the Chat API so we need no @types/vscode bump.
interface ChatRequestLike {
  command?: string;
  prompt?: string;
}
interface ChatStreamLike {
  markdown(value: string): void;
}
interface ChatApiLike {
  createChatParticipant?: (
    id: string,
    handler: (request: ChatRequestLike, ctx: unknown, stream: ChatStreamLike, token: unknown) => unknown
  ) => vscode.Disposable;
}

export function registerChatParticipant(
  context: vscode.ExtensionContext,
  deps: ChatDeps
): boolean {
  const chatApi = (vscode as unknown as { chat?: ChatApiLike }).chat;
  if (!chatApi || typeof chatApi.createChatParticipant !== "function") {
    return false; // Chat API unavailable — nothing to register.
  }

  const handler = (
    request: ChatRequestLike,
    _ctx: unknown,
    stream: ChatStreamLike
  ): void => {
    const intent = parseChatCommand(String(request.command ?? ""), String(request.prompt ?? ""));
    if (intent.kind === "verify") {
      const res = deps.recordValidation(intent.commandType, intent.result);
      stream.markdown(formatVerify(intent.commandType, intent.result, res.ok, res.sessionTitle));
    } else if (intent.kind === "summary") {
      stream.markdown(formatSummary(deps.getSummaryData()));
    } else {
      stream.markdown(helpText());
    }
  };

  try {
    const participant = chatApi.createChatParticipant("agentKarma.chat", handler);
    context.subscriptions.push(participant);
    return true;
  } catch {
    return false; // Defensive: never let chat registration break activation.
  }
}
