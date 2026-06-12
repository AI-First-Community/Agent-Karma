# Implementation Plan — Task-by-Task Build Sequence

> The granular, ordered build plan that sits **below** [`roadmap.md`](roadmap.md) (which defines releases + acceptance) and **above** the code. Build **foundation-first**, one task at a time, each with explicit files, dependencies, and a "Done when" check. Follow [`../CONTRIBUTING.md`](../CONTRIBUTING.md) §4 for the per-task protocol. Do not start a task until its dependencies are complete and verified.

**Legend:** each task = `T<release>.<n>`. **Files** = modules from [`architecture.md`](architecture.md) §4. **DoD** = Definition of Done (observable). A task is done only when its DoD passes in the Extension Development Host (or unit test for pure logic) **and** no Prime Directive is broken.

---

## Build-order overview (dependency spine)

```
Phase 0  Bootstrap ──► 0.1 Foundation ──► 0.2 Dharma ──► 0.3 File+Validation ──► 0.4 Git+Trace+Phal(prov.) ──► 0.5 Score+Phal(final)+Dashboard ──► 0.6 Export+Delete+Docs ──► 0.7 Pre-commit nudge
   (tooling)         (storage,session,    (intent,       (the hero:           (git, timeline,            (objective score,         (ship)        (forcing
                      status bar,           prompt hint,   collectors)          provisional outcome)        finalize outcome)                       function)
                      survive-reload)       cards)
```

**Two rules:** (1) pure logic (`scoring/`, `cards/`, `utils/`) is built test-first as pure functions; (2) every task that writes state must go through `localStore` (no ad-hoc file writes).

---

## Phase 0 — Project bootstrap (before any feature)

Goal: a runnable, empty extension with tooling and guardrails in place, so every later task has a home and the no-network invariant is enforced from day one.

> **Maintainer inputs for Phase 0:**
> - ✅ **GitHub repo:** `https://github.com/AI-First-Community/Agent-Karma-Public` — **private now**, goes **public at v1.0**. Personal account, independent project.
> - ✅ **Maintainer identity:** Sanjeev Azad · `sanjeev.azad@gmail.com` — used for git author, `package.json` `author`, and `LICENSE` copyright.
> - ✅ **License:** Apache-2.0.
> - ⏳ **VS Code Marketplace publisher ID/handle** (personal; created on the Marketplace, separate from GitHub) — needed only at publish time, not for early commits.
>
> **Authorship hygiene (enforced — see [`../CONTRIBUTING.md`](../CONTRIBUTING.md) §5):** independent project, no employer/corporate affiliation anywhere; commit messages, PRs, and co-authors are plain and human-authored with no AI-tool trailers. Set repo-local `git config user.name/user.email` to the personal identity before the first commit.

| Task | Goal | Files | DoD |
|---|---|---|---|
| **T0.0.1** | Scaffold the extension project | `extension/package.json`, `tsconfig.json`, `esbuild.js`, `.vscodeignore` | `npm install` + build produce a `.vsix`-able bundle; `package.json` declares `engines.vscode`, `main`, empty `contributes` |
| **T0.0.2** | Activation + a no-op `activate/deactivate` | `src/extension.ts` | Extension activates on `onStartupFinished` in the Dev Host with no errors |
| **T0.0.3** | Establish the data-model contract + entrypoint | `src/core/types.ts` (full data model + settings + store/event-store + score-result shapes + pinned bands), `src/extension.ts` (no-op activate). Module dirs (`storage/`, `collectors/`, …) are created by their own tasks, not pre-stubbed. | Project compiles; all interfaces from architecture §5 + settings/event-store exist and are exported |
| **T0.0.4** | Dev tooling | eslint + prettier config, a unit test runner (vitest or `@vscode/test-electron`) | `npm run lint` and `npm test` run (even with zero tests) |
| **T0.0.5** | **CI no-network invariant** | `.github/workflows/ci.yml` (or script) | CI builds, lints, tests, and **greps the bundle for `http`/`https`/`fetch`/`net`/runtime deps — fails on any hit** |
| **T0.0.6** | Repo hygiene files | `LICENSE` (Apache-2.0), `SECURITY.md`, `.gitignore` (ignores `agent-karma-data/`, build output, local notes) | Files present; README/PRIVACY/CONTRIBUTING already exist |

> License: **Apache-2.0** (decided — patent grant; cleaner than competitors' BSL).

---

## Release 0.1 — Foundation (most granular; build this rock-solid)

Goal: a developer can start/end a session via one-click status bar, it persists to atomic local JSON, survives reload **and a hard kill**, and shows in a basic dashboard. No scoring, no collectors yet.

| Task | Goal | Files | Depends | DoD |
|---|---|---|---|---|
| **T0.1.1** | Local JSON store (atomic) | `storage/localStore.ts` | T0.0.3 | Read/write `sessions.json`/`events.json`/`settings.json` under `globalStorageUri`; **write-temp-then-rename**; `schemaVersion`; all I/O in try/catch; unit-tested round-trip + corrupt-file recovery |
| **T0.1.2** | Typed event bus | `core/eventBus.ts` | T0.0.3 | `emit`/`on` for `AgentKarmaEvent`; unit-tested |
| **T0.1.3** | Session manager core | `core/sessionManager.ts` | T0.1.1, T0.1.2 | `startSession(meta)` / `endSession()`; enforces **one global-singleton active session**; persists + emits on each transition; rejects a second start |
| **T0.1.4** | Command registration | `extension.ts` | T0.1.3 | `agentKarma.startSession` / `endSession` / `showDashboard` registered; appear in palette; wired to manager |
| **T0.1.5** | Status bar control | `statusbar/statusBarItem.ts`, `utils/time.ts` | T0.1.3 | Shows `▶ Agent Karma: Start` (idle) / `● Recording MM:SS — End` (active); `.command` toggles; **elapsed computed from `startedAt`** via 1 Hz `setInterval`; `clearInterval` on end + `deactivate`; disposables in `context.subscriptions` |
| **T0.1.6** | **Spike A — survive-reload + crash recovery** | `storage/localStore.ts`, `core/sessionManager.ts`, `extension.ts` | T0.1.3, T0.1.5 | Active session restored after reload **and `kill -9`** (flush-on-event + `globalState` pointer); elapsed recomputed; **stale session (>`idleEndMinutes`) prompts resume-or-finalize**; documented recovery path |
| **T0.1.7** | Basic dashboard (read-only) | `dashboard/dashboardProvider.ts`, `dashboard/dashboardHtml.ts` | T0.1.1, T0.1.4 | Webview opens via command; lists active + recent sessions from the store; **strict CSP, nonce'd, no remote assets**; theme variables |
| **T0.1.8** | **Spike B — shell-integration probe** | throwaway `spikes/shell-probe.ts` (not shipped) | — | Confirm `onDidEndTerminalShellExecution` + exit code across bash/zsh/pwsh/Git Bash, with/without starship/p10k; **write findings into [`architecture.md`](architecture.md) §9 caveats**; decide the 0.3 fallback shape |
| **T0.1.9** | **Spike C — git multi-root probe** | throwaway `spikes/git-probe.ts` (not shipped) | — | Confirm `git diff HEAD --numstat` per-folder summation, `ENOENT`/exit-128 handling, spawn timeout; findings into spec §8 |

**Release 0.1 verification (run before declaring done):** the [`specification.md`](specification.md) §15 **Session** checklist + "no network calls (CI green)". Manually: start → reload window → still recording with correct elapsed → kill the host process → reopen → stale-session prompt appears.

---

## Release 0.2 — Dharma Card & Prompt Hint

Goal: capture intent at start; generate the Dharma Card; soft prompt hygiene hint.

| Task | Goal | Files | Depends | DoD |
|---|---|---|---|---|
| **T0.2.1** | Start-session input flow | `core/sessionManager.ts`, `extension.ts` | 0.1 | QuickPick/inputs for title, AI tool (spec §3), task type (spec §4), intent; **pre-fill last-used tool/task** (persist in settings.json) |
| **T0.2.2** | Prompt hygiene hint (pure) | `scoring/promptScorer.ts` | T0.0.3 | Implements scoring §2 exactly; returns `{score,label,reasons}`; **unit-tested** incl. the worked label boundaries |
| **T0.2.3** | Dharma Card generator (pure) | `cards/dharmaCard.ts` | T0.2.2 | Implements scoring §5 exactly (use exact task literals; `contextProvided`/`expectedValidation`/`riskLevel`); **unit-tested** |
| **T0.2.4** | Render Dharma Card | `dashboard/dashboardHtml.ts` | T0.1.7, T0.2.3 | Card visible; prompt hint shown **visually distinct as a soft hint**, not a headline |

**Verify:** spec §15 **Dharma Card** checklist.

---

## Release 0.3 — File & Validation Tracking (THE HERO — build carefully)

Goal: passively capture saved files (metadata) and validation commands (type+result only) while a session is active.

| Task | Goal | Files | Depends | DoD |
|---|---|---|---|---|
| **T0.3.1** | File util: ext + test-file + source filter | `utils/fileUtils.ts` | T0.0.3 | `isTestFile`, extension, `isSourceFile` (scheme `file`, in workspace, not `.git`/output); **unit-tested** |
| **T0.3.2** | File collector | `collectors/fileCollector.ts`, `privacy/privacyRules.ts` | T0.3.1, 0.1 | `onDidSaveTextDocument` → metadata only, **deduped per session**, active-session-only; **never stores content**; routed through `privacyRules` |
| **T0.3.3** | Command classifier (pure) | `utils/commandClassifier.ts` | T0.0.3 | string → type per spec §7 table; **then the raw string is discarded by callers**; unit-tested |
| **T0.3.4** | Manual validation command | `extension.ts`, `collectors/terminalCollector.ts` | T0.3.3 | `agentKarma.addValidationCommand` logs `{type,result:unknown,source:'logged'}`; **raw string never persisted** |
| **T0.3.5** | Auto terminal capture (best-effort) | `collectors/terminalCollector.ts` | T0.3.3, Spike B | `onDidEndTerminalShellExecution` → `{type,result,source:'observed'}`; **absent exit code → `unknown` (never `failed`)**; degrades silently if unavailable |
| **T0.3.6** | End-of-session validation prompt | `core/sessionManager.ts` | T0.3.4 | On end, prompt **invites logging commands** (not yes/no); logged items count |

**Verify:** spec §15 **File tracking** + **Validation** checklists; confirm raw command strings never hit `sessions.json`/`events.json`.

---

## Release 0.4 — Git Diff, Karma Trace & provisional Phal

| Task | Goal | Files | Depends | DoD |
|---|---|---|---|---|
| **T0.4.1** | Git collector | `collectors/gitCollector.ts` | Spike C, 0.1 | `git diff HEAD --numstat` per workspace folder via `child_process`, summed; `captured=false` + no-crash on ENOENT/128/multi-root; spawn timeout; **diff content never stored** |
| **T0.4.2** | Karma Trace builder (pure) | `cards/phalCard.ts` or `dashboard/` | 0.3 | Chronological event list per spec §9; rendered in dashboard |
| **T0.4.3** | Optional unscored reflection capture | `core/sessionManager.ts`, `core/types.ts` (`ReflectionNote`) | 0.3 | End-flow optional prompt (reviewed-diff / outcome-matched) stored as **unscored** `reflection`; emits `outcome.reported`; **never feeds the score** |
| **T0.4.4** | Provisional Phal Card (pure) | `cards/phalCard.ts` | T0.4.1 | Counts, `validationDetected`, recommendations (coaching) — **score-independent fields only**; `commandsDetected` = types+results; unit-tested |
| **T0.4.5** | Render Trace + provisional Phal | `dashboard/dashboardHtml.ts` | T0.4.2, T0.4.4 | Both visible in dashboard |

**Verify:** spec §15 **Git diff** checklist; Phal shows counts/recommendations (outcome finalized in 0.5).

---

## Release 0.5 — Objective Karma Score, finalized Phal & Dashboard polish

| Task | Goal | Files | Depends | DoD |
|---|---|---|---|---|
| **T0.5.1** | Objective Karma Score (pure) | `scoring/karmaScore.ts` | 0.3, 0.4 | Implements scoring §3 exactly: components, **vacuous-truth rule**, observed-vs-logged, `Math.round`; returns `{score,label,reasons}`; **unit-tested incl. the §6 worked example = 62** |
| **T0.5.2** | EMA + self-comparative trend | `scoring/karmaScore.ts`, `storage/localStore.ts` | T0.5.1 | EMA alpha 0.3, **seeded on session 1** (`→`), arrow thresholds ±3; persisted; unit-tested |
| **T0.5.3** | Finalize Phal outcome (task-aware) | `cards/phalCard.ts` | T0.5.1 | Outcome uses the score (Ready/Needs/High Risk) + **Low-risk-no-validation = Informational**; computed **after** the score; unit-tested |
| **T0.5.4** | Score in dashboard + "why this score" | `dashboard/dashboardHtml.ts` | T0.5.1 | **Checklist leads, number supports**; every reason visible and matches the number; trend arrow shown; number quiet until ≥5 sessions |
| **T0.5.5** | Recent-sessions list polish | `dashboard/dashboardHtml.ts` | T0.5.4 | Readable recent list with score + outcome |

**Verify:** spec §15 **Karma Score** + **Phal Card** + **Dashboard** checklists.

---

## Release 0.6 — Export, Delete & Docs finalize

| Task | Goal | Files | Depends | DoD |
|---|---|---|---|---|
| **T0.6.1** | JSON export | `export/jsonExporter.ts`, `extension.ts` | 0.5 | `agent-karma-session-{id}.json`; **no source/terminal output/raw command strings** |
| **T0.6.2** | Markdown export | `export/markdownExporter.ts` | 0.5 | Session/Dharma/Score/Trace/Phal/Recommendations/optional reflection; same privacy guarantees |
| **T0.6.3** | Delete all data | `storage/localStore.ts`, `extension.ts` | 0.1 | `agentKarma.deleteAllData` (confirm) wipes everything incl. `globalState` pointer; nothing remains |
| **T0.6.4** | Finalize README/PRIVACY/usage | root docs | all | Install/usage/privacy accurate; honest differentiation |

**Verify:** spec §15 **Export** + **Privacy** checklists.

---

## Release 0.7 — Pre-Commit Nudge (opt-in forcing function)

| Task | Goal | Files | Depends | DoD |
|---|---|---|---|---|
| **T0.7.0** | **Spike D — safe hook install** | throwaway probe | 0.6 | Confirm safe detect/chain/decline for husky/lefthook/pre-commit-framework; reversible removal; zero network |
| **T0.7.1** | Hook install/remove | `hooks/preCommitNudge.ts`, `extension.ts` | T0.7.0 | `install`/`removePreCommitNudge`; **never clobbers** existing hooks (chain or decline w/ guidance); reversible; `enablePreCommitNudge` setting |
| **T0.7.2** | Nudge logic | `hooks/preCommitNudge.ts` | T0.7.1, 0.5 | On commit, if AI-assisted changes staged + no validation in latest session → **non-blocking, dismissible** reminder; never hard-fails commit; no network |

**Verify:** spec §15 **Pre-commit nudge** checklist.

---

## Cross-cutting "Definition of Done" (every task)

1. Scope = exactly the task; no pulling future work forward.
2. Pure logic has unit tests; behavior verified in the Extension Development Host.
3. All seven Prime Directives hold (esp. **no network**, **no source/terminal-output/raw-command-string stored**).
4. I/O wrapped in try/catch; extension never crashes the host.
5. Code matches [`architecture.md`](architecture.md) module boundaries; reuses existing utils.
6. Earlier releases' acceptance criteria still pass (no regressions).
7. The change reads like the surrounding code.

## Recommended first three sessions of actual work
1. **Phase 0 (T0.0.1–T0.0.6)** — bootstrap + CI no-network guard.
2. **T0.1.1–T0.1.5** — store, event bus, session core, commands, status bar.
3. **T0.1.6 (Spike A)** — survive-reload/crash recovery, the load-bearing foundation requirement. Get this bulletproof before building anything on top.
