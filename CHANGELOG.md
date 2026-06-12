# Changelog

All notable changes to Agent Karma are documented here. Pre-1.0: building the MVP one release at a time, then expanding toward the vision (see `docs/vision.md`).

## [0.25.0]
- **Dashboard redesign.** A calmer, deeper, more insightful view — same privacy ethos, no new tracking.
  - **🪔 Karmic reflection banner** — an inspiring, mood-tinted line that reads your real state through the Dharma → Karma → Phal lens (luminous / steady / forming / dim), with a sub-line tying the intent you set to whether your Phal was validated. Encouraging, never shaming.
  - **Bento grid layout** — cards arranged in equal-height rows that reflow to a single column on a narrow panel.
  - **Active / Previous tabs** — the two session views are now one tabbed card (pure CSS, no scripts).
  - **New insight, across time & risk:** a **validation-consistency strip** (one square per session — did you validate it?), **Karma & validation-rate trend lines**, a **task × check heatmap** ("where you validate"), a **risk × validation** breakdown (did you check the work that mattered?), and **habit trend arrows** (rising / steady / slipping).
  - **Collapsible** reference sections (Karma rules, Recent sessions) to keep the page short.
  - Adapts to any VS Code theme (light, dark, high-contrast) automatically.

## [0.24.0]
- **Validation Skill Finder.** A new **Suggested next step** dashboard panel and the **Find Validation Gaps** command turn what you *keep skipping* (from your own history) plus what *net you lack* (from the workspace scan) into the single highest-leverage fix — e.g. *"You skipped Lint on 60% of recent AI sessions and there's no pre-commit hook"* → **one click installs the nudge**. Where there's no one-click fix, it gives concrete copy-pasteable steps. Closes the loop from "you lack the net" to "here's the net."

## [0.23.0]
- **`@agentkarma` chat participant.** Open the Chat view and talk to Agent Karma:
  - **/verify** _tests · build · lint · types_ — log that you validated the AI's work. This is the one capture path that covers **AI used in a browser or copy-pasted in** — work no log-parser can see. If no session is active it starts a per-day one for you. Self-reported, so it counts as *logged*, never *observed*.
  - **/summary** — your latest Karma + reasons, this week's nudge, and your "can you validate?" status, right in chat.
- Requires VS Code 1.90+ for the Chat API; on older builds the participant simply doesn't appear (everything else still works). No language model is called — the chat surface stays fully local and no-network.

## [0.22.0]
- **Transparent Karma rules.** The score is now a **declared rule table** — every point traces to one named, documented rule. A new **Karma rules** dashboard panel lists every rule, its weight, and whether your last session earned it. No opaque engine: you can read exactly how Karma is computed.
- **"Why did my Karma move?"** A new command and dashboard card explain the change from your previous session in plain language — *which rules you gained or dropped* — not just a number going up or down. Works on your existing history.

## [0.21.0]
- **Validation Context Health — "Can you even validate?"** A new dashboard panel (and the **Check Validation Readiness** command) scans your workspace — config only, never your source — for the means to verify AI output: can tests / build / lint / type check run, is there a pre-commit net, CI, and does your agent guidance file (CLAUDE.md / AGENTS.md) ask the AI to validate. It names your single biggest gap and, when that gap is the pre-commit net, offers to install it in one click. A question no other coach asks.

## [0.20.0]
- **Sharper by subtraction.** The dashboard now **leads with the validation checklist**, not a big score. The Karma number stays **quiet until ~5 sessions** make a self-comparative trend meaningful (it shows "Karma forming" before that), and the redundant trend arrows are de-duplicated.
- **Removed the per-AI-tool "Patterns" table** — it read like the usage dashboard we explicitly reject. Your validation strengths/gaps still live in **Validation habits**.
- **Ambient mode is now labelled experimental** — it captures saves + validation but no intent, so a focused session you start yourself scores more meaningfully.

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
