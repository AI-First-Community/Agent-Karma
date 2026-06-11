# Changelog

All notable changes to Agent Karma are documented here. Pre-1.0: building the MVP one release at a time.

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
