import * as fs from "fs";
import * as path from "path";
import { renderDashboardHtml } from "../dashboard/dashboardHtml";
import { computeStats } from "../dashboard/dashboardStats";
import { generateWeeklyReflection } from "../reflection/weeklyReflection";
import { AgentKarmaSession, AgentKarmaEvent, DharmaCard, PhalCard } from "../core/types";

// Dev-only: render the dashboard with sample data to a standalone HTML file you can
// open in a browser (no extension install needed) to iterate on the visual design.
//   npm run preview  →  preview/dashboard-preview.html

// VS Code dark-theme variables injected so the webview CSS resolves in a browser.
const THEME = `:root{
  --vscode-font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
  --vscode-foreground:#cccccc; --vscode-descriptionForeground:#9d9d9d;
  --vscode-panel-border:#3c3c3c; --vscode-textCodeBlock-background:#1e1e1e;
  --vscode-textBlockQuote-background:#252526;
  --vscode-charts-green:#89d185; --vscode-charts-yellow:#e2c08d; --vscode-charts-red:#f48771; --vscode-charts-blue:#3794ff;
  --vscode-input-background:#3c3c3c; --vscode-input-foreground:#cccccc; --vscode-input-border:#3c3c3c;
  --vscode-button-background:#0e639c; --vscode-button-foreground:#ffffff; --vscode-button-hoverBackground:#1177bb;
  --vscode-inputValidation-errorBackground:#5a1d1d;
}
body{ background:#1e1e1e; }`;

function dharma(over: Partial<DharmaCard>): DharmaCard {
  return { task: "T", aiTool: "Claude Code", intentType: "Bug Fix", intentClarity: "Good", contextProvided: "Partial", expectedValidation: "Recommended", riskLevel: "Medium", ...over };
}
function phal(over: Partial<PhalCard>): PhalCard {
  return { outcome: "Needs Review", filesChanged: 2, testFilesChanged: 1, validationDetected: true, commandsDetected: [{ type: "Test", result: "passed" }], recommendations: ["Run lint before committing."], ...over };
}
function sess(i: number, over: Partial<AgentKarmaSession>): AgentKarmaSession {
  const started = new Date(Date.now() - i * 6 * 3600 * 1000).toISOString();
  return { id: `s${i}`, title: "S", aiTool: "Claude Code", taskType: "Bug Fix", intent: "fix the bug and add a test", startedAt: started, endedAt: started, status: "completed", ...over };
}

const sessions: AgentKarmaSession[] = [
  sess(1, { title: "Add JWT refresh tokens", aiTool: "Claude Code", taskType: "Refactoring", karmaScore: 78, karmaScoreLabel: "Good", karmaTrend: "up", karmaReasons: ["Tests run (+25)", "Tests passed — observed (+10)", "Build / type-check ran clean (+20)", "Test added/updated alongside code (+15)", "Change measured (+5)"], dharmaCard: dharma({ intentType: "Refactoring", riskLevel: "Medium", contextProvided: "Good" }), phalCard: phal({ outcome: "Ready for Review", validationDetected: true }) }),
  sess(2, { title: "Fix login off-by-one", aiTool: "Claude Code", taskType: "Bug Fix", karmaScore: 62, karmaScoreLabel: "Good", karmaTrend: "flat", karmaReasons: ["Tests run (+25)", "Tests passed — observed (+10)", "Test added/updated alongside code (+15)", "Change measured (+5)", "Prompt hygiene hint (+7)"], dharmaCard: dharma({ riskLevel: "Medium" }), phalCard: phal({ outcome: "Needs Review" }) }),
  sess(3, { title: "Write README", aiTool: "ChatGPT", taskType: "Documentation", karmaScore: 18, karmaScoreLabel: "Needs Attention", karmaTrend: "down", karmaReasons: ["Prompt hygiene hint (+8)"], dharmaCard: dharma({ intentType: "Documentation", riskLevel: "Low", expectedValidation: "Not Mentioned" }), phalCard: phal({ outcome: "Informational", validationDetected: false, testFilesChanged: 0, commandsDetected: [], recommendations: [] }) }),
  sess(4, { title: "Patch auth vulnerability", aiTool: "Cursor", taskType: "Security Fix", karmaScore: 35, karmaScoreLabel: "Needs Attention", karmaTrend: "down", karmaReasons: ["Change measured (+5)", "Prompt hygiene hint (+5)"], dharmaCard: dharma({ intentType: "Security Fix", riskLevel: "High", expectedValidation: "Recommended" }), phalCard: phal({ outcome: "High Risk", validationDetected: false, testFilesChanged: 0, commandsDetected: [], recommendations: ["Run tests or a build to validate these changes.", "Run lint before committing."] }) }),
  sess(5, { title: "Add cart tests", aiTool: "Claude Code", taskType: "Test Generation", karmaScore: 80, karmaScoreLabel: "Strong", karmaTrend: "up", karmaReasons: ["Tests run (+25)", "Tests passed — observed (+10)", "Build / type-check ran clean (+20)", "Lint ran clean (+15)", "Change measured (+5)"], dharmaCard: dharma({ intentType: "Test Generation", riskLevel: "Low" }), phalCard: phal({ outcome: "Ready for Review", validationDetected: true }) }),
];

const events: AgentKarmaEvent[] = [
  { id: "e1", sessionId: "s2", type: "session.started", timestamp: sessions[1].startedAt, data: {} },
  { id: "e2", sessionId: "s2", type: "file.saved", timestamp: sessions[1].startedAt, data: { fileName: "auth.service.ts", isTestFile: false } },
  { id: "e3", sessionId: "s2", type: "file.saved", timestamp: sessions[1].startedAt, data: { fileName: "auth.service.spec.ts", isTestFile: true } },
  { id: "e4", sessionId: "s2", type: "validation.command", timestamp: sessions[1].startedAt, data: { commandType: "Test", result: "passed", source: "observed" } },
  { id: "e5", sessionId: "s2", type: "git.diff.summary", timestamp: sessions[1].startedAt, data: { captured: true, filesChanged: 2, linesAdded: 48, linesDeleted: 12 } },
];

const last = sessions[1];
const html = renderDashboardHtml({
  nonce: "preview",
  cspSource: "vscode-resource:",
  stats: computeStats(sessions, 64),
  reflection: generateWeeklyReflection(sessions, new Date().toISOString()),
  active: undefined,
  activeEvents: [],
  lastCompleted: last,
  lastCompletedEvents: events.filter((e) => e.sessionId === last.id),
  recent: sessions.slice().reverse(),
});

// Dev-only browser preview: inject theme vars, drop the webview CSP (so the browser
// can load the web font), and load Manrope from Google Fonts purely for visual review.
// NOTE: the shipped extension stays no-network; Manrope is bundled locally there.
const FONT_LINKS =
  '<link rel="preconnect" href="https://fonts.googleapis.com">' +
  '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' +
  '<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">';

const themed = html
  .replace(/<meta http-equiv="Content-Security-Policy"[^>]*>/, "")
  .replace("</head>", `${FONT_LINKS}</head>`)
  .replace('<style nonce="preview">', `<style nonce="preview">${THEME}`);

const outDir = path.resolve(__dirname, "../../preview");
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, "dashboard-preview.html");
fs.writeFileSync(outFile, themed, "utf8");
console.log("Preview written to", outFile);
