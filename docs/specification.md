# Functional Specification

> What Agent Karma does, behaviorally. Reconciles Build Spec v1.0 with the locked decisions: manual session model + mandatory de-risking · **objective (action-based) Karma Score** · demoted log-less framing · **opt-in pre-commit nudge** · privacy fixes. For scoring math see [`scoring-model.md`](scoring-model.md) (the normative source for all score/card rules); for code structure see [`architecture.md`](architecture.md).

---

## 1. Session lifecycle (MANUAL model + de-risking)

A **session** is the unit of reflection: one AI-assisted piece of work, from intent to outcome.

### 1.1 Starting a session
- Primary entry: **one click on the Status Bar item** `▶ Agent Karma: Start`.
- Secondary entry: Command Palette → `Agent Karma: Start Session`.
- Collect (pre-filled with last-used values where possible): **Session title**, **AI tool** (§3), **Task type** (§4), **Intent / prompt** (free text).
- Emit `session.started`; generate the **Dharma Card** (§5).
- Only **one** active session at a time, treated as a **global singleton** across all VS Code windows (see architecture). Starting while active is disallowed (offer to end the current one).

### 1.2 During a session (passive, metadata-only capture)
While active, Agent Karma captures **safe metadata only** (§6–§8). Nothing is captured when no session is active.

### 1.3 Ending a session
On end:
1. Run the **Git diff summary** (§8).
2. **Validation prompt (action-based, not a rating):** *"Did you run tests / build / lint this session? Add them so they count."* — this opens `Add Validation Command` so the user **logs the actual commands**. It is **not** a yes/no that feeds the score.
3. *(Optional, unscored)* **Reflection prompt:** "Reviewed the diff? Did the outcome match your intent?" — captured for the user's own journaling and the Markdown export only. **Contributes 0 to the Karma Score** and is clearly labeled as reflection, not measurement.
4. Compute the **Karma Score** (objective — [`scoring-model.md`](scoring-model.md) §3), then the **Phal Card** (§10, depends on the score), then render the **Karma Trace** (§9). Show the summary immediately.

### 1.4 Mandatory de-risking behaviors (acceptance criteria, not optional)
1. **Status Bar reflects state at all times** (idle vs recording + elapsed MM:SS). One click to start/end. Elapsed is computed from `startedAt`, never an incrementing counter (survives sleep/suspend).
2. **Forgot-to-start nudge:** if ≥ N files (default 5, configurable) are saved with no active session, show **one** dismissible/snoozable toast: *"Tracking a session? Start Agent Karma to capture this."* Never auto-start; never repeat within the same idle period.
3. **Forgot-to-end safety net:** after `idleEndMinutes` (default 30) idle in an active session, prompt to end (or auto-finalize). On reactivation after a crash/kill, if an active session's last event is older than `idleEndMinutes`, prompt to **resume or finalize** rather than silently resuming.
4. **Survive reload:** the active session persists across VS Code reload/restart. Flush on **every** event (never rely on `deactivate()`). **Hard requirement** — see architecture §6 for the persistence + recovery design.
5. **Remember last** AI tool & task type; pre-fill on next Start.
6. **Immediate value:** show Phal Card + Karma Score the moment a session ends.

---

## 2. Commands

| Command | Status Bar? | Purpose |
|---|---|---|
| `Agent Karma: Start Session` (`agentKarma.startSession`) | ✅ primary | Begin a session |
| `Agent Karma: End Session` (`agentKarma.endSession`) | ✅ primary | Finalize a session |
| `Agent Karma: Show Dashboard` (`agentKarma.showDashboard`) | — | Open the Webview dashboard |
| `Agent Karma: Add Validation Command` (`agentKarma.addValidationCommand`) | — | Log a test/build/lint run |
| `Agent Karma: Install Pre-Commit Nudge` (`agentKarma.installPreCommitNudge`) | — | Opt-in git hook (§13) |
| `Agent Karma: Remove Pre-Commit Nudge` (`agentKarma.removePreCommitNudge`) | — | Cleanly uninstall the hook |
| `Agent Karma: Export Current Session as JSON` (`agentKarma.exportJson`) | — | Export JSON |
| `Agent Karma: Export Current Session as Markdown` (`agentKarma.exportMarkdown`) | — | Export Markdown |
| `Agent Karma: Delete All Local Data` (`agentKarma.deleteAllData`) | — | Wipe everything (with confirm) |

---

## 3. AI tool options (manual selection — a label, not a capability)

`GitHub Copilot` · `Claude Code` · `Cursor` · `ChatGPT` · `Windsurf` · `Antigravity` · `Devin` · `Gemini CLI` · `Codex CLI` · `Other` · `Unknown`

> **Framing note (honest):** this tag is a *label for your own reflection*, not a tracking capability. Agent Karma works the same regardless of where your AI ran — because it observes your *validation actions* (tests/git), which are tool-agnostic. We do **not** market this as a headline "log-less coverage" feature; it is simply true that the tool doesn't care where the code came from. (See [`differentiation.md`](differentiation.md).)

## 4. Task type options (exact literals — used verbatim everywhere)

`Bug Fix` · `Test Generation` · `Refactoring` · `Documentation` · `Explanation` · `Performance Improvement` · `Security Fix` · `Migration` · `Architecture` · `DevOps` · `Other`

Task type drives `expectedValidation` and `riskLevel` ([`scoring-model.md`](scoring-model.md) §5). Always use these exact strings — never abbreviate "Performance Improvement" to "Performance."

---

## 5. Dharma Card (intent)

Generated at session start. **All field rules are defined normatively in [`scoring-model.md`](scoring-model.md) §5** — this spec does not duplicate them to avoid drift. Display:

```
Dharma Card
Task: Fix login failure bug
AI Tool: Claude Code
Intent Type: Bug Fix
Intent Clarity: Good            ← prompt hygiene hint label (soft, ≤10% of score)
Context Provided: Partial
Expected Validation: Recommended
Risk Level: Medium
```

---

## 6. File change tracking

- Use VS Code document **save** events (`onDidSaveTextDocument`); track **only while a session is active**.
- Filter to real source files: `uri.scheme === 'file'` and within a workspace folder; ignore `.git/`, output/log, and untitled/virtual docs.
- **Dedupe by path within the session** (auto-save fires often).
- Store per file: **file name**, **extension**, **isTestFile**, and **full path only if** `agentKarma.storeFullFilePath` (default off). **Never store file content.**
- **Test-file detection:** the file name contains `test`, `spec`, `_test`, or `.spec`.

## 7. Validation command tracking (the hero signal — action-based)

1. **Automatic (best-effort):** terminal **shell integration** (`onDidEndTerminalShellExecution`) provides the command and, where available, an **exit code** → `result: passed | failed | unknown`. Availability is conditional (some shells/prompts/SSH won't provide it; exit code may be `undefined`). Treat absent exit code as `unknown`, never `failed`.
2. **Manual fallback (always available):** `Agent Karma: Add Validation Command` logs a command (e.g. `npm test`, `npm run build`, `npm run lint`, `pytest`, `mvn test`, `gradle build`). Logged commands earn the base "ran" points; only an **observed** result grants the "tests passed" bonus ([`scoring-model.md`](scoring-model.md) §3.2).

**Command classification** (by keyword):

| Type | Keywords |
|---|---|
| Test | test, pytest, jest, mocha, vitest |
| Build | build, compile, mvn package, gradle build |
| Lint | lint, eslint, flake8, ruff |
| Type Check | tsc, typecheck |
| Security | snyk, audit, trivy |
| Other | everything else |

**Privacy (important):** persist and export only the **command type and result** — **not** the raw command string (it can contain paths, hosts, or tokens). The raw string may be used transiently for classification, then discarded. See [`../PRIVACY.md`](../PRIVACY.md). **Never capture terminal output.**

## 8. Git diff summary

- On session end, attempt `git diff HEAD --numstat` (captures staged + unstaged working-tree delta). Parse to `filesChanged`, `linesAdded`, `linesDeleted`.
- **Working directory & multi-root:** run per workspace folder and sum; if a folder is not a git repo, skip it. MVP fully supports single-root; multi-root sums across roots with a documented caveat. Handle `ENOENT` (git absent) and exit 128 (not a repo) gracefully.
- On any failure: **do not crash**; set `captured: false`, store a friendly internal error, continue. Use a spawn timeout for very large diffs.
- **Never store actual diff content.**

---

## 9. Karma Trace (action timeline)

Chronological, human-readable timeline, visible in the dashboard and Markdown export. Note: the **Karma Score is computed before the Phal Card** (Phal depends on it); the trace may list them adjacently.

```
Karma Trace
10:00 Session started
10:01 Intent captured  ·  Dharma Card generated
10:05 File saved: auth.service.ts
10:12 File saved: auth.service.spec.ts
10:20 Validation: Test command observed (passed)
10:24 Git diff summary captured (3 files, +48 / -12)
10:25 Karma Score generated (64 · Good)
10:25 Phal Card generated (Needs Review)
10:25 Session ended
```

## 10. Phal Card (outcome — task-aware)

Generated at session end **after** the Karma Score. Rules are normative in [`scoring-model.md`](scoring-model.md) §4. `commandsDetected` lists command **types + results**, never raw strings.

```
Phal Card
Outcome: Needs Review
Files Changed: 3
Test Files Changed: 1
Validation Detected: Yes (Test · passed)
Recommendations:
- Run lint before committing.
```

A Low-risk task with no validation (e.g. Documentation) is **Informational**, not "High Risk" — see §4 of the scoring doc.

---

## 11. Dashboard (Webview, no React)

Sections: **Header** · **Active session** · **Recent sessions** · **Dharma Card** · **Karma Score** (with "why this score" breakdown + self-comparative trend arrow) · **Karma Trace** · **Phal Card** · **Recommendations** · **Export actions** · **Privacy note** (`Local-first. No source code captured. No cloud upload.`).

Lead the visual hierarchy with the **validation checklist**; show the number as a supporting element. Use a strict CSP (`default-src 'none'`, nonce'd scripts, `webview.cspSource` for styles) and VS Code theme variables. No remote URLs/CDNs/fonts (preserves the no-network guarantee).

## 12. Export

- **JSON:** full session object + related events → `agent-karma-session-{sessionId}.json`.
- **Markdown:** human-readable summary (Session / Dharma / Karma Score / Karma Trace / Phal / Recommendations / optional reflection note).
- Exports contain **no source-code content, no terminal output, and no raw command strings** (command type + result only). Free-text intent/notes are echoed verbatim (the user typed them) — documented in PRIVACY.md.

## 13. Pre-commit nudge (opt-in forcing function)

The product's thesis at the moment of risk. **Off by default; the user must explicitly install it.**

- `Agent Karma: Install Pre-Commit Nudge` installs a local git `pre-commit` hook in the current repo. `Remove Pre-Commit Nudge` cleanly uninstalls it.
- On commit, if AI-touched files are staged and **no validation command was run in the active/most-recent session**, it surfaces: *"You're about to commit AI-assisted changes with no tests run this session. Proceed?"* — **non-blocking and dismissible** (coaching, not a gate; never hard-fails the commit).
- **Safety requirements (mandatory):** never clobber an existing hook or a husky/lefthook/pre-commit-framework setup — detect and **chain** or **decline with guidance**; make installation reversible; do everything locally; no network. This is the **highest-risk MVP feature** and gets its own spike (see [`roadmap.md`](roadmap.md)).
- Stays within every Prime Directive: local, no telemetry, no surveillance, dismissible.

## 14. Privacy settings

See [`../PRIVACY.md`](../PRIVACY.md) for the full contract. Hardcoded rules no setting can override: never capture source content, never capture terminal output, never persist/export raw command strings, never upload, never telemetry, never login.

---

## 15. Testing checklist (verify before any release is "done")

**Session:** start/end work · cannot start a second active session · active session **survives reload** and recovers from a hard kill (stale-session prompt) · forgot-to-start nudge fires after threshold · forgot-to-end prompt fires on idle · completed session appears in Recent.
**Dharma Card:** clarity/context/validation/risk shown per scoring §5.
**File tracking:** saves captured only during an active session · non-source/`.git` files filtered · dedup works · test files detected · file content never stored.
**Validation:** manual command can be logged · auto-detection works where shell integration exists · absent exit code → `unknown` (never `failed`) · end-of-session prompt invites logging commands (not yes/no) · **raw command strings never persisted/exported**.
**Git diff:** `git diff HEAD --numstat` summary works in a repo · no crash outside a repo · multi-root sums/skips correctly · diff content never stored.
**Karma Score:** objective — no points from un-run "clean" rows (vacuous-truth) · observed-pass bonus requires real exit code · validation rows = 90/100 · `Math.round` rounding · EMA seeded on session 1 · reasons match the number · prompt hint ≤10%.
**Phal Card:** computed after the score · Low-risk no-validation = Informational, not High Risk · recommendations are coaching.
**Pre-commit nudge:** installs/removes cleanly · never clobbers existing hooks · non-blocking · no network.
**Dashboard:** opens · all cards visible · checklist leads, score supports.
**Export:** JSON/Markdown work · no source/terminal output/raw command strings.
**Privacy:** data stays local · delete-all works · settings respected · **no network calls made** (CI bundle check).
