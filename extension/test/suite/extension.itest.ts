import * as assert from "assert";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as vscode from "vscode";

const EXTENSION_ID = "innovate-with-sanjeev.agent-karma";
const COMMANDS = [
  "agentKarma.startSession",
  "agentKarma.endSession",
  "agentKarma.showDashboard",
  "agentKarma.addValidationCommand",
];

suite("Agent Karma — integration", () => {
  let storageDir: string;
  let api: {
    getStorageDir(): string;
    startSession(meta: { title: string; aiTool: string; taskType: string; intent: string }): void;
  };

  suiteSetup(async () => {
    const ext = vscode.extensions.getExtension(EXTENSION_ID);
    assert.ok(ext, `extension ${EXTENSION_ID} not found`);
    api = (await ext!.activate()) as typeof api;
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
    // Stub the end-flow prompts so they run unattended.
    const w = vscode.window as unknown as Record<string, unknown>;
    // The end flow shows two kinds of quick pick: the validation checklist
    // (canPickMany → expects an array back) and the single-choice reflection
    // (expects one item). Honour the option so neither path gets the wrong shape.
    w.showQuickPick = async (items: unknown, opts?: { canPickMany?: boolean }) => {
      if (opts?.canPickMany) return Array.isArray(items) ? items : [];
      return Array.isArray(items) ? items[0] : items;
    };
    w.showInformationMessage = async () => "Done";
    w.showWarningMessage = async () => undefined;

    // Start via the automation API (the UI is now a webview form).
    api.startSession({ title: "E2E session", aiTool: "Claude Code", taskType: "Bug Fix", intent: "fix and test" });
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

  test("exports the latest session as valid JSON (no raw command strings)", async () => {
    const outPath = path.join(os.tmpdir(), `ak-export-${process.pid}.json`);
    const w = vscode.window as unknown as Record<string, unknown>;
    w.showSaveDialog = async () => vscode.Uri.file(outPath);

    await vscode.commands.executeCommand("agentKarma.exportJson");

    assert.ok(fs.existsSync(outPath), "export file not written");
    const parsed = JSON.parse(fs.readFileSync(outPath, "utf8"));
    assert.ok(parsed.session && Array.isArray(parsed.events), "export shape is wrong");
    fs.rmSync(outPath, { force: true });
  });

  test("Delete All Local Data wipes the store (after confirmation)", async () => {
    const w = vscode.window as unknown as Record<string, unknown>;
    w.showWarningMessage = async () => "Delete Everything";

    await vscode.commands.executeCommand("agentKarma.deleteAllData");

    assert.ok(
      !fs.existsSync(path.join(storageDir, "sessions.json")),
      "sessions.json should be gone after delete-all"
    );
  });
});
