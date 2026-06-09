# Roadmap — Phase-Wise Release Plan

> Build **one release at a time**. Do not begin a release until the previous one is complete, working, and verified against its acceptance criteria. See [`../CONTRIBUTING.md`](../CONTRIBUTING.md) §4. Each release is a shippable increment.

---

## Release 0.1 — Foundation (+ de-risking spikes)

**Build:** VS Code extension skeleton (`onStartupFinished`) · command registration · local JSON storage under `globalStorageUri` with **atomic writes** · Start/End session · **Status Bar control (one-click, MM:SS timer from `startedAt`)** · Show Dashboard (basic) · **survive-reload + crash recovery**.

**Spikes (de-risk before building UI on top):**
- **Spike A — Crash-safe persistence:** prove kill-9 / hard-reload recovery via flush-on-event + `globalState` pointer + stale-session reconciliation. (Load-bearing hard requirement.)
- **Spike B — Shell-integration matrix:** test bash/zsh/fish/pwsh/Git Bash, with/without starship/oh-my-zsh/p10k; confirm manual logging + end-of-session prompt fully cover the Basic-tier / undefined-exit-code / unsupported-shell cases.
- **Spike C — Git multi-root:** validate per-folder `git diff HEAD --numstat` summation, `ENOENT`/exit-128 handling, spawn timeout.
- **CI invariant:** grep the bundle for `http`/`https`/`fetch`/`net`; fail on any runtime dependency.

**Acceptance criteria:**
- [ ] Extension installs/activates locally; commands appear in the palette.
- [ ] Status Bar shows idle/recording + one-click toggle; timer is correct after sleep.
- [ ] Start a session (title, AI tool, task type, intent); cannot start a second.
- [ ] End a session.
- [ ] Active session **survives reload AND a hard kill** (stale-session prompt on stale restore).
- [ ] Session saved to local JSON (atomic); appears in a basic dashboard.
- [ ] No network calls (CI check passes).

---

## Release 0.2 — Dharma Card & Prompt Hint

**Build:** AI tool selection · task type selection (exact literals) · intent input · **prompt hygiene hint** (≤10%, soft) · Dharma Card generation (rules per [`scoring-model.md`](scoring-model.md) §5) · reasons · remember-last-tool/task pre-fill.

**Acceptance criteria:**
- [ ] Intent entered; prompt hint score + label generated; reasons visible.
- [ ] Dharma Card shows intent clarity, context, expected validation, risk level — matching scoring §5 exactly.
- [ ] Prompt hint presented as a soft hint (visually distinct), not a headline metric.
- [ ] Next session pre-fills last-used AI tool and task type.

---

## Release 0.3 — File & Validation Tracking  *(the hero release)*

**Build:** file-save tracking (filtered, deduped, metadata only) · test-file detection · `Add Validation Command` (manual log) · automatic terminal detection via shell integration (best-effort) · command classification → **type + result only; raw string discarded** · end-of-session prompt that **invites logging commands** (not yes/no).

**Acceptance criteria:**
- [ ] Saved files captured only during an active session; `.git`/non-source filtered; deduped.
- [ ] Test files detected; file **content never stored**.
- [ ] Manual command logged and classified correctly.
- [ ] Auto-detection works where shell integration exists; absent exit code → `unknown` (never `failed`); absence breaks nothing.
- [ ] End-of-session prompt invites logging commands so missed auto-detection is recoverable.
- [ ] **Raw command strings never persisted/exported** (type + result only); terminal output never stored.

---

## Release 0.4 — Git Diff, Karma Trace & (provisional) Phal Card

**Build:** `git diff HEAD --numstat` summary (counts only, multi-root) · Karma Trace (chronological) · **provisional Phal Card** (outcome fields that don't depend on the score) · optional **unscored** reflection capture (reviewed-diff / outcome-matched) for journaling · coaching recommendations.

> Note: the Phal **outcome** depends on the Karma Score (built in 0.5). Ship a provisional Phal here (counts, validationDetected, recommendations) and finalize the score-dependent outcome in 0.5.

**Acceptance criteria:**
- [ ] Git diff summary captured in a repo; `captured=false` + no crash otherwise; multi-root sums/skips.
- [ ] Diff content never stored.
- [ ] Karma Trace shows the chronological timeline.
- [ ] Provisional Phal shows counts, validationDetected, recommendations (coaching tone).
- [ ] Optional reflection note captured and clearly marked **unscored**.

---

## Release 0.5 — Objective Karma Score & Dashboard

**Build:** **objective, action-based Karma Score (~90% validation)** per [`scoring-model.md`](scoring-model.md) · vacuous-truth rule · observed-vs-logged distinction · EMA trend (alpha 0.3, seeded session 1) · score label + transparent reasons · **finalize Phal outcome** (task-aware, uses the score) · improved dashboard (checklist leads, number supports) · recent-sessions list.

**Acceptance criteria:**
- [ ] Karma Score computed per scoring §3; validation rows = 90/100; `Math.round`.
- [ ] No points awarded for "clean" rows that never ran (vacuous-truth); tests-passed bonus requires a real observed exit code.
- [ ] Score explanation (every reason) visible and matches the number.
- [ ] Trend shown vs. the user's own EMA (seeded on session 1) — no cross-developer comparison.
- [ ] Prompt hint contributes ≤10%.
- [ ] Phal outcome finalized: Low-risk no-validation = Informational, not High Risk.
- [ ] Dashboard readable: validation checklist leads, score supports; all cards visible.

---

## Release 0.6 — Export, Delete & Documentation finalize

**Build:** JSON export · Markdown export · Delete All Local Data (confirm) · finalize README/PRIVACY/usage docs.

> The privacy contract governs every release from 0.1; this release **finalizes** the docs, it doesn't introduce the rules.

**Acceptance criteria:**
- [ ] JSON export → `agent-karma-session-{id}.json`.
- [ ] Markdown export (Session / Dharma / Score / Trace / Phal / Recommendations / optional reflection).
- [ ] Exports contain **no source content, no terminal output, no raw command strings**.
- [ ] Delete All wipes everything; nothing remains.
- [ ] README explains install/usage/privacy and differentiates honestly vs. existing tools.

---

## Release 0.7 — Pre-Commit Nudge (opt-in forcing function)

> The highest-implementation-risk feature — isolated into its own release with a spike so it never destabilizes the core loop.

**Spike D — Safe hook install:** detect existing/foreign hooks (husky, lefthook, pre-commit framework); chain or decline with guidance; guarantee clean, reversible removal; verify zero network.

**Build:** `Install / Remove Pre-Commit Nudge` commands · the non-blocking pre-commit reminder ("AI-assisted changes, no tests run this session — proceed?") · `agentKarma.enablePreCommitNudge` setting (off by default).

**Acceptance criteria:**
- [ ] Install/remove works cleanly; **never clobbers** an existing hook setup.
- [ ] Nudge is non-blocking and dismissible; never hard-fails a commit.
- [ ] Fires only when AI-assisted changes are staged with no validation in the latest session.
- [ ] Fully local; no network; reversible.

---

## MVP complete = Releases 0.1 → 0.6 green (0.7 = first fast-follow)

A developer can: install → start a session → work with any AI tool → see files changed → log/observe validation → end → review Dharma Card, Karma Trace, Phal Card, **objective** Karma Score → export → delete. It must feel **useful, simple, trustworthy, and respectful.** 0.7 adds the forcing function that converts the post-mortem into a moment-of-truth.

**Watch in early feedback:** *do users actually start sessions, or forget?* If forgetting is common even with the de-risking nudges, the 0.7 pre-commit forcing function (and, if needed, optional passive detection — collectors are already session-gated) is the lever.

---

## Post-MVP (only after the above is stable)

| Phase | Capability |
|---|---|
| 1 | Better dashboard charts |
| 2 | Weekly personal reflection (one plain-language nudge) |
| 3 | Git commit association |
| 4 | Local, source-free "validation receipt" for a PR (hash, not diff) |
| 5 | Local-LLM-based prompt coach (opt-in, still local) |
| 6 | Pull request summary generator |
| 7 | OpenTelemetry-compatible export (opt-in) |
| 8 | Optional self-hosted community dashboard |
| 9 | Plugin system for AI-tool adapters |
| 10 | JetBrains extension |

Every post-MVP phase must still honor every Prime Directive in [`../CONTRIBUTING.md`](../CONTRIBUTING.md).
