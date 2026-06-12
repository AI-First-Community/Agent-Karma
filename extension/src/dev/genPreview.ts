import * as fs from "fs";
import * as path from "path";
import { renderDashboardHtml } from "../dashboard/dashboardHtml";
import { computeStats, computeValidationHabits, computeValidationHeatmap } from "../dashboard/dashboardStats";
import { assessReadiness } from "../collectors/validationReadiness";
import { explainKarmaMove } from "../scoring/karmaExplain";
import { findSkills } from "../skills/skillFinder";
import { generateWeeklyReflection } from "../reflection/weeklyReflection";
import { AgentKarmaSession, AgentKarmaEvent, DharmaCard, PhalCard } from "../core/types";

// Dev-only: render the dashboard with sample data to a standalone HTML file you can
// open in a browser (no extension install needed) to iterate on the visual design.
//   npm run preview  →  preview/dashboard-preview.html

// VS Code theme variables injected so the webview CSS resolves in a browser. We emit
// BOTH a dark and a light set scoped by class, plus a toggle, so the (theme-adaptive)
// dashboard can be previewed in each. In the real extension these come from VS Code.
const FONT = `--vscode-font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;`;
const DARK_VARS = `${FONT}
  --vscode-foreground:#cccccc; --vscode-descriptionForeground:#9d9d9d;
  --vscode-panel-border:#3c3c3c; --vscode-textCodeBlock-background:#1e1e1e;
  --vscode-textBlockQuote-background:#252526;
  --vscode-charts-green:#89d185; --vscode-charts-yellow:#e2c08d; --vscode-charts-red:#f48771; --vscode-charts-blue:#3794ff;
  --vscode-input-background:#3c3c3c; --vscode-input-foreground:#cccccc; --vscode-input-border:#3c3c3c;
  --vscode-button-background:#0e639c; --vscode-button-foreground:#ffffff;
  --vscode-inputValidation-errorBackground:#5a1d1d;`;
const LIGHT_VARS = `${FONT}
  --vscode-foreground:#3b3b3b; --vscode-descriptionForeground:#6c6c6c;
  --vscode-panel-border:#e5e5e5; --vscode-textCodeBlock-background:#f3f3f3;
  --vscode-textBlockQuote-background:#f5f5f5;
  --vscode-charts-green:#16825d; --vscode-charts-yellow:#b5870a; --vscode-charts-red:#cd3131; --vscode-charts-blue:#1a73c7;
  --vscode-input-background:#ffffff; --vscode-input-foreground:#3b3b3b; --vscode-input-border:#cecece;
  --vscode-button-background:#005fb8; --vscode-button-foreground:#ffffff;
  --vscode-inputValidation-errorBackground:#f2dede;`;
const THEME = `
  html.theme-dark{ ${DARK_VARS} }
  html.theme-dark body{ background:#1e1e1e; }
  html.theme-light{ ${LIGHT_VARS} }
  html.theme-light body{ background:#ffffff; }
  .theme-toggle{ position:fixed; top:12px; right:12px; z-index:99; padding:7px 13px; border-radius:8px; border:1px solid var(--vscode-panel-border); background:var(--vscode-input-background); color:var(--vscode-foreground); font-family:inherit; font-size:13px; font-weight:600; cursor:pointer; box-shadow:0 1px 4px rgba(0,0,0,0.18); }`;

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
  // A longer history so trends + heatmap have real shape (varied task types repeated).
  sess(6, { title: "Refactor payments module", taskType: "Refactoring", karmaScore: 70, karmaTrend: "up", karmaReasons: ["Tests run (+25)", "Build / type-check ran clean (+20)", "Change measured (+5)"], dharmaCard: dharma({ intentType: "Refactoring", riskLevel: "High" }), phalCard: phal({ outcome: "Ready for Review", validationDetected: true, commandsDetected: [{ type: "Test", result: "passed" }, { type: "Build", result: "passed" }] }) }),
  sess(7, { title: "Add export endpoint", taskType: "Feature", karmaScore: 45, karmaTrend: "down", karmaReasons: ["Change measured (+5)", "Prompt hygiene hint (+6)"], dharmaCard: dharma({ intentType: "Feature", riskLevel: "Medium" }), phalCard: phal({ outcome: "Needs Review", validationDetected: false, commandsDetected: [] }) }),
  sess(8, { title: "Fix race in queue", taskType: "Bug Fix", karmaScore: 66, karmaTrend: "up", karmaReasons: ["Tests run (+25)", "Tests passed — observed (+10)", "Change measured (+5)"], dharmaCard: dharma({ riskLevel: "High" }), phalCard: phal({ outcome: "Needs Review", validationDetected: true }) }),
  sess(9, { title: "Tidy CSS tokens", taskType: "Refactoring", karmaScore: 30, karmaTrend: "down", karmaReasons: ["Change measured (+5)"], dharmaCard: dharma({ intentType: "Refactoring", riskLevel: "Low" }), phalCard: phal({ outcome: "Informational", validationDetected: false, commandsDetected: [] }) }),
  sess(10, { title: "Add 2FA", taskType: "Feature", karmaScore: 72, karmaTrend: "up", karmaReasons: ["Tests run (+25)", "Build / type-check ran clean (+20)", "Lint ran clean (+15)", "Change measured (+5)"], dharmaCard: dharma({ intentType: "Feature", riskLevel: "High" }), phalCard: phal({ outcome: "Ready for Review", validationDetected: true, commandsDetected: [{ type: "Test", result: "passed" }, { type: "Lint", result: "passed" }] }) }),
  sess(11, { title: "Patch SQLi", taskType: "Security Fix", karmaScore: 40, karmaTrend: "down", karmaReasons: ["Change measured (+5)", "Prompt hygiene hint (+5)"], dharmaCard: dharma({ intentType: "Security Fix", riskLevel: "High" }), phalCard: phal({ outcome: "High Risk", validationDetected: false, commandsDetected: [] }) }),
  sess(12, { title: "Fix date parsing", taskType: "Bug Fix", karmaScore: 64, karmaTrend: "up", karmaReasons: ["Tests run (+25)", "Tests passed — observed (+10)", "Change measured (+5)"], dharmaCard: dharma({ riskLevel: "Medium" }), phalCard: phal({ outcome: "Needs Review", validationDetected: true }) }),
  sess(13, { title: "Onboarding flow", taskType: "Feature", karmaScore: 55, karmaTrend: "flat", karmaReasons: ["Tests run (+25)", "Change measured (+5)"], dharmaCard: dharma({ intentType: "Feature", riskLevel: "Medium" }), phalCard: phal({ outcome: "Needs Review", validationDetected: true }) }),
  sess(14, { title: "Fix null deref", taskType: "Bug Fix", karmaScore: 75, karmaTrend: "up", karmaReasons: ["Tests run (+25)", "Tests passed — observed (+10)", "Build / type-check ran clean (+20)", "Change measured (+5)"], dharmaCard: dharma({ riskLevel: "Medium" }), phalCard: phal({ outcome: "Ready for Review", validationDetected: true }) }),
  sess(15, { title: "Cache layer", taskType: "Refactoring", karmaScore: 82, karmaTrend: "up", karmaReasons: ["Tests run (+25)", "Tests passed — observed (+10)", "Build / type-check ran clean (+20)", "Lint ran clean (+15)", "Change measured (+5)"], dharmaCard: dharma({ intentType: "Refactoring", riskLevel: "Medium" }), phalCard: phal({ outcome: "Ready for Review", validationDetected: true, commandsDetected: [{ type: "Test", result: "passed" }, { type: "Build", result: "passed" }, { type: "Lint", result: "passed" }] }) }),
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
  validationHabits: computeValidationHabits(sessions),
  heatmap: computeValidationHeatmap(sessions),
  reflection: generateWeeklyReflection(sessions, new Date().toISOString()),
  readiness: assessReadiness({
    testScript: true, testDep: true, testConfigFile: true,
    buildScript: true, tsconfig: true,
    lintScript: true, lintConfig: true, lintDep: true,
    typecheckScript: true,
    ci: true, preCommit: false, agentMentionsValidation: false,
  }),
  active: undefined,
  activeEvents: [],
  lastCompleted: last,
  lastCompletedEvents: events.filter((e) => e.sessionId === last.id),
  karmaMove: explainKarmaMove(sessions[0], last),
  suggestions: findSkills({
    recentCount: 5,
    skipRates: [
      { type: "Lint", skipRate: 60 },
      { type: "Test", skipRate: 20 },
      { type: "Build", skipRate: 40 },
      { type: "Type Check", skipRate: 40 },
    ],
    signals: {
      testScript: true, testDep: true, testConfigFile: true,
      buildScript: true, tsconfig: true,
      lintScript: true, lintConfig: true, lintDep: true,
      typecheckScript: true,
      ci: true, preCommit: false, agentMentionsValidation: false,
    },
    preCommitInstallable: true,
  }),
  recent: sessions.slice().reverse(),
});

// Dev-only browser preview: inject theme vars, drop the webview CSP (so the browser
// can load the web font), and load Manrope from Google Fonts purely for visual review.
// NOTE: the shipped extension stays no-network; Manrope is bundled locally there.
const FONT_LINKS =
  '<link rel="preconnect" href="https://fonts.googleapis.com">' +
  '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' +
  '<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">';

const TOGGLE =
  `<button class="theme-toggle" onclick="var h=document.documentElement;h.classList.toggle('theme-dark');h.classList.toggle('theme-light')">◐ Light / Dark</button>`;

const themed = html
  .replace(/<meta http-equiv="Content-Security-Policy"[^>]*>/, "")
  .replace('<html lang="en">', '<html lang="en" class="theme-dark">')
  .replace("</head>", `${FONT_LINKS}</head>`)
  .replace('<style nonce="preview">', `<style nonce="preview">${THEME}`)
  .replace("</body>", `${TOGGLE}</body>`);

const outDir = path.resolve(__dirname, "../../preview");
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, "dashboard-preview.html");
fs.writeFileSync(outFile, themed, "utf8");
console.log("Preview written to", outFile);
