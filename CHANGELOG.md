# Changelog

All notable changes to Agent Karma are documented here. Pre-1.0: building the MVP one release at a time, then expanding toward the vision (see `docs/vision.md`).

## [0.19.0]
- The pre-commit nudge is the product's spine now. It's **change-aware** — it reminds you only when the *actually-staged files* were never validated (not just "your last session"), which also fixes it misfiring under ambient mode.
- Agent Karma **offers to install the nudge on first run** (local, non-blocking, removable) so the one moment that matters — the commit — isn't buried in the command palette.

## [0.18.0]
- **Ambient mode** (opt-in): continuous, no-manual-start capture grouped by day. Toggle with "Agent Karma: Toggle Ambient Mode" — it quietly captures saves + validation and rolls over at midnight. Fits long, continuous, mixed AI+manual development.

## [0.17.0]
- End-of-session validation prompt is now a **checklist** (tick Tests / Build / Lint / Type check; auto-detected pre-checked) instead of typing a command.

## [0.16.0]
- **Manrope** font bundled locally and used in the dashboard (stays no-network).

## [0.15.0]
- **Validation Habits** insight panel (where you're strong / your biggest gap) and **actionable recommendations**.

## [0.14.0]
- Dashboard design upgrade: Manrope-first typography, pill badges, gradient sparkline, circular Karma gauge.

## [0.13.0]
- Browser **preview generator** for the dashboard (dev tool) + initial visual polish.

## [0.12.0]
- **Effort-vs-risk cross-check**: a per-session flag when a higher-risk task ships without validation (and reassurance when a high-risk change *was* validated). Low-risk changes draw no nag.

## [0.11.0]
- **Patterns**: per-AI-tool and per-task-type **validation-rate** breakdown on the dashboard (your own insight — never a usage count).

## [0.10.0]
- **Weekly reflection**: one plain-language, self-comparative coaching nudge distilled from your last 7 days, on the dashboard and via a command.

## [0.9.0]
- **Rich dashboard**: a hero Karma + trend, an "at a glance" panel (validation rate, tests-run, a Karma sparkline, outcome distribution) — zero-dependency, CSP-safe SVG/CSS charts.

## [0.8.0]
- **Start Session config UI**: a single form (title, AI tool, task type, intent) replaces the sequential prompts; pre-selects your last choices.

## [0.7.0]
- Opt-in, non-blocking **pre-commit nudge**: a local git hook that reminds you to validate AI-assisted changes before committing when your latest session logged no tests/build/lint. Safe install — never clobbers husky / lefthook / pre-commit-framework / existing hooks; fully reversible. Off by default.

## [0.6.0]
- **JSON and Markdown export** of a session (metadata only).
- **Delete All Local Data** — permanent, confirmed wipe of every session, event, and setting.

## [0.5.0]
- **Objective Karma Score** — validation-weighted (~90%), built only from validation actions actually observed or logged; vacuous-truth rule; self-comparative EMA trend.
- Dashboard leads with the validation checklist; the number and trend support it.

## [0.4.0]
- **Git diff summary** (counts only), **Karma Trace** timeline, and the **Phal Card** outcome view.
- Optional unscored end-of-session reflection.

## [0.3.0]
- **File-save and validation-command capture** (metadata only; raw command strings are classified then discarded).
- Best-effort terminal shell-integration auto-capture + manual "Add Validation Command".

## [0.2.0]
- **Dharma Card** (intent clarity, context, expected validation, risk) and a soft prompt-hygiene hint.
- Remembers your last AI tool / task type.

## [0.1.0]
- Foundation: manual sessions via a one-click status bar, atomic local JSON storage, survive-reload/crash recovery, and a basic dashboard.
