# Architecture

> How Agent Karma is built. Pure client-side VS Code extension, TypeScript, local JSON, simple Webview. No server, no database, no framework, no network. For behavior see [`specification.md`](specification.md); for scoring see [`scoring-model.md`](scoring-model.md).

---

## 1. Principles

- **Everything runs in the VS Code extension host.** No backend, no network calls of any kind.
- **Pure logic is pure.** Scoring, classification, and card generation are pure functions over data — trivially unit-testable.
- **Collectors are passive and isolated.** Each capture concern (files, terminal, git) is its own module behind a small interface; they emit only safe metadata, each wrapped so a throw never crashes the host.
- **One source of truth.** The local JSON store holds all state; the dashboard renders it read-only.
- **Fail safe.** Every I/O boundary (storage, git, terminal, hooks) is try/catch and degrades gracefully.
- **Privacy is centralized.** All "what may we store" rules live in one auditable module.
- **Objective score.** The score consumes only observed/logged *actions* — there are no feeling-based self-report inputs (see scoring-model.md).

---

## 2. Module map

```
VS Code Extension Host
 │
 ├─ extension.ts ............. activate/deactivate, command registration, wiring, reactivation
 │
 ├─ core/
 │   ├─ sessionManager.ts .... start/end, global-singleton active session, survive-reload, de-risking nudges
 │   ├─ eventBus.ts .......... typed pub/sub for AgentKarmaEvent
 │   └─ types.ts ............. all shared interfaces (see §5)
 │
 ├─ collectors/  (passive, metadata-only — active session only)
 │   ├─ fileCollector.ts ..... onDidSaveTextDocument → file name/ext/isTestFile (filtered, deduped)
 │   ├─ terminalCollector.ts . onDidEndTerminalShellExecution → command TYPE + result (raw string discarded)
 │   └─ gitCollector.ts ...... `git diff HEAD --numstat` per workspace folder on end → counts only
 │
 ├─ scoring/  (PURE functions)
 │   ├─ promptScorer.ts ...... prompt hygiene hint (≤10% weight)
 │   └─ karmaScore.ts ........ objective validation-weighted Karma Score + reasons + EMA trend
 │
 ├─ cards/  (PURE functions)
 │   ├─ dharmaCard.ts ........ intent → Dharma Card
 │   └─ phalCard.ts .......... session+events+score → task-aware Phal Card + recommendations
 │
 ├─ hooks/
 │   └─ preCommitNudge.ts .... opt-in git pre-commit hook: safe install/remove + nudge logic
 │
 ├─ storage/
 │   └─ localStore.ts ........ load/save/migrate JSON under globalStorageUri; atomic writes; flush-per-event
 │
 ├─ privacy/
 │   └─ privacyRules.ts ...... single source of "what may be stored"; sanitizers (drops raw command strings)
 │
 ├─ dashboard/
 │   ├─ dashboardProvider.ts . Webview lifecycle + message handling (CSP-hardened)
 │   └─ dashboardHtml.ts ..... renders store → HTML (no React, no remote assets)
 │
 ├─ export/
 │   ├─ jsonExporter.ts
 │   └─ markdownExporter.ts
 │
 ├─ statusbar/
 │   └─ statusBarItem.ts ..... ▶ Start / ● Recording MM:SS — End  (primary entry; 1 Hz timer from startedAt)
 │
 └─ utils/
     ├─ time.ts
     ├─ fileUtils.ts ......... extension + isTestFile detection + source-file filter
     └─ commandClassifier.ts . command string → Test/Build/Lint/Type Check/Security/Other (then discard string)
```

---

## 3. Data flow

1. **Activate** (`onStartupFinished`) → keep cheap: create status bar, register the always-on save listener (for forgot-to-start), load the small active-session pointer. **Reactivation:** if a session has `status:"active"`, restore it, recompute elapsed from `startedAt`, re-arm collectors; if its last event is older than `idleEndMinutes`, prompt resume-or-finalize.
2. **Start** → `sessionManager` creates a session, persists it (atomic), emits `session.started`; `dharmaCard` generates; status bar flips to recording.
3. **During** → collectors observe events, run metadata through `privacyRules` sanitizers, append `AgentKarmaEvent`s via `eventBus`; `localStore` **flushes on each event** (survive-reload — never deferred to `deactivate`).
4. **End** → `gitCollector` runs; the validation prompt invites logging commands; **`karmaScore` computes first**, then `phalCard` (depends on the score); everything persists; dashboard shows the summary.
5. **Pre-commit (opt-in)** → `preCommitNudge` consults the latest session's validation state and surfaces a non-blocking reminder; never touches the network.
6. **Export/Delete** → operate on the local store only.

---

## 4. Folder structure (repository)

```
agent-karma/
├─ README.md
├─ LICENSE
├─ PRIVACY.md
├─ CONTRIBUTING.md
├─ SECURITY.md
├─ docs/  { README, product-strategy, differentiation, competitive-coverage, specification, architecture, scoring-model, roadmap, implementation-plan }
└─ extension/
   ├─ package.json          # contributes: commands, config, activation events (onStartupFinished)
   ├─ tsconfig.json
   ├─ esbuild.js            # bundling (single auditable bundle for the no-network CI check)
   └─ src/
      ├─ extension.ts
      ├─ core/        { sessionManager.ts, eventBus.ts, types.ts }
      ├─ collectors/  { fileCollector.ts, terminalCollector.ts, gitCollector.ts }
      ├─ scoring/     { promptScorer.ts, karmaScore.ts }
      ├─ cards/       { dharmaCard.ts, phalCard.ts }
      ├─ hooks/       { preCommitNudge.ts }
      ├─ storage/     { localStore.ts }
      ├─ privacy/     { privacyRules.ts }
      ├─ dashboard/   { dashboardProvider.ts, dashboardHtml.ts }
      ├─ export/      { jsonExporter.ts, markdownExporter.ts }
      ├─ statusbar/   { statusBarItem.ts }
      └─ utils/       { time.ts, fileUtils.ts, commandClassifier.ts }
```

---

## 5. Data model (TypeScript)

```typescript
export interface AgentKarmaSession {
  id: string;
  title: string;
  aiTool: string;            // a reflection label (specification §3) — NOT a scored input
  taskType: string;          // exact literal (specification §4)
  intent: string;            // user's typed intent (free text, local only)
  startedAt: string;         // ISO-8601 — source of truth for elapsed time
  endedAt?: string;
  status: "active" | "completed";
  promptHintScore?: number;  // prompt hygiene hint (0–100, ≤10% of Karma)
  promptHintLabel?: string;  // "Needs Clarity" | "Decent" | "Good" | "Excellent"
  dharmaCard?: DharmaCard;
  phalCard?: PhalCard;
  karmaScore?: number;       // 0–100, OBJECTIVE (validation-weighted, action-based)
  karmaScoreLabel?: string;  // "Needs Attention" | "Improving" | "Good" | "Strong"
  gitDiffSummary?: GitDiffSummary;
  reflection?: ReflectionNote; // OPTIONAL, UNSCORED — journaling only
}

export interface ReflectionNote {            // contributes 0 to the score — never used in karmaScore
  reviewedDiff?: "yes" | "no";
  outcomeMatchedIntent?: "yes" | "partly" | "no";
  note?: string;
}

export interface AgentKarmaEvent {
  id: string;
  sessionId: string;
  type:
    | "session.started" | "intent.captured" | "prompt.scored" | "dharma.generated"
    | "file.saved" | "validation.command"            // observed OR logged (data.source distinguishes)
    | "git.diff.summary" | "karma.score.generated" | "phal.generated"
    | "outcome.reported"                              // optional unscored reflection
    | "session.ended";
  timestamp: string;         // ISO-8601
  data: Record<string, unknown>;
}

export interface DharmaCard {
  task: string; aiTool: string; intentType: string;
  intentClarity: "Needs Clarity" | "Decent" | "Good" | "Excellent";
  contextProvided: "None" | "Partial" | "Good";
  expectedValidation: "Not Mentioned" | "Recommended" | "Explicit";
  riskLevel: "Low" | "Medium" | "High";
}

export interface FileSavedEventData {
  fileName: string; extension: string;
  fullPath?: string;         // only if agentKarma.storeFullFilePath = true
  isTestFile: boolean;
}

export interface ValidationCommandEventData {
  commandType: "Test" | "Build" | "Lint" | "Type Check" | "Security" | "Other";
  result: "passed" | "failed" | "unknown";
  source: "observed" | "logged";   // only "observed" results grant the tests-passed bonus
  // NOTE: the raw command string is used transiently for classification then DISCARDED — never persisted/exported.
}

export interface GitDiffSummary {
  filesChanged: number; linesAdded: number; linesDeleted: number;
  captured: boolean;         // false if git unavailable / not a repo / failed
  error?: string;
}

export interface PhalCard {
  outcome: "Ready for Review" | "Needs Review" | "High Risk" | "Informational";
  filesChanged: number; testFilesChanged: number;
  validationDetected: boolean;
  commandsDetected: { type: string; result: string }[];  // TYPES + results — never raw strings
  recommendations: string[];
}
```

---

## 6. Storage, persistence & recovery

- **Location:** `context.globalStorageUri` → `agent-karma-data/` with `sessions.json`, `events.json`, `settings.json`, `exports/`. Plain JSON, human-readable, `schemaVersion` for migration.
- **Active-session pointer:** keep a tiny pointer in `context.globalState` (Memento, VS Code-managed, atomic) alongside the full record in JSON; reconcile on startup. This is the load-bearing survive-reload mechanism.
- **Atomic writes:** write to a temp file then rename, so `sessions.json` and `events.json` never tear under a crash mid-flush.
- **Flush-on-event:** persist promptly after every state change. **Never** rely on `deactivate()` (VS Code gives no flush guarantee on crash/kill).
- **Recovery:** on activate, restore any `active` session, recompute elapsed from `startedAt`, re-arm collectors, and run the stale-session check.
- All reads/writes wrapped in try/catch; on failure show a friendly message, keep the in-memory session, retry on next event.

## 7. Configuration (`contributes.configuration`)

`agentKarma.enabled` (true) · `agentKarma.storeFullFilePath` (false) · `agentKarma.captureTerminalCommands` (true — type+result only) · `agentKarma.captureTerminalOutput` (false, hardcoded-off) · `agentKarma.capturePromptText` (true) · `agentKarma.enableGitDiffSummary` (true) · `agentKarma.enablePreCommitNudge` (false — opt-in) · `agentKarma.forgotToStartThreshold` (5) · `agentKarma.idleEndMinutes` (30).

## 8. Dependencies policy

Default to **zero runtime dependencies** beyond the VS Code API and Node built-ins (`child_process` for git, `fs`/`path` for storage). Justify any addition in the PR. Dev-only: TypeScript, esbuild, `@types/vscode`, a test runner. **No React, no DB driver, no HTTP client** (its presence would contradict the Prime Directives). A **CI check greps the bundle for `http`/`https`/`fetch`/`net` and fails on any runtime dependency** — turning "no network" into an enforced invariant.

## 9. Error-handling rules

- Git missing / not a repo / multi-root edge → `gitDiffSummary.captured = false`, continue.
- Shell integration unavailable or no exit code → rely on manual logging + end-of-session prompt; absent exit code = `unknown`, never `failed`.
- Storage write fails → friendly toast, keep in-memory session, retry next event.
- Pre-commit hook: existing/foreign hook detected → chain or decline with guidance; never clobber; always reversible.
- A collector throwing must never bubble up to crash the host — isolate each in try/catch.
