import * as assert from "assert";
import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";

const EXTENSION_ID = "passion4architecture.agent-karma";
const COMMANDS = [
  "agentKarma.startSession",
  "agentKarma.endSession",
  "agentKarma.showDashboard",
  "agentKarma.addValidationCommand",
];

suite("Agent Karma — integration", () => {
  let storageDir: string;

  suiteSetup(async () => {
    const ext = vscode.extensions.getExtension(EXTENSION_ID);
    assert.ok(ext, `extension ${EXTENSION_ID} not found`);
    const api = (await ext!.activate()) as { getStorageDir(): string };
    assert.ok(api && typeof api.getStorageDir === "function", "activate() did not return the test API");
    storageDir = api.getStorageDir();
  });

  test("activates and registers all user commands", async () => {
    const cmds = await vscode.commands.getCommands(true);
    for (const c of COMMANDS) {
      assert.ok(cmds.includes(c), `missing command: ${c}`);
    }
  });

  test("opens the dashboard without throwing", async () => {
    await vscode.commands.executeCommand("agentKarma.showDashboard");
  });

  test("start → end writes a finalized session (with Phal + score) to local JSON", async () => {
    // Stub the interactive prompts so the flows run unattended.
    const w = vscode.window as unknown as Record<string, unknown>;
    w.showInputBox = async () => "E2E session";
    w.showQuickPick = async (items: unknown) =>
      Array.isArray(items) ? items[0] : items;
    w.showInformationMessage = async () => "Done";
    w.showWarningMessage = async () => undefined;

    await vscode.commands.executeCommand("agentKarma.startSession");
    await vscode.commands.executeCommand("agentKarma.endSession");

    const sessionsPath = path.join(storageDir, "sessions.json");
    assert.ok(fs.existsSync(sessionsPath), `sessions.json not written at ${sessionsPath}`);

    const store = JSON.parse(fs.readFileSync(sessionsPath, "utf8")) as {
      sessions: { status: string; phalCard?: unknown; karmaScore?: number }[];
    };
    const completed = store.sessions.filter((s) => s.status === "completed");
    assert.ok(completed.length >= 1, "no completed session was recorded");

    const last = completed[completed.length - 1];
    assert.ok(last.phalCard, "completed session has no Phal card");
    assert.strictEqual(typeof last.karmaScore, "number", "completed session has no Karma score");
  });
});
