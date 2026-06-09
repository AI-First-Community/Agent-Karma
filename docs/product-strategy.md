# Product Strategy

> The "why" and "what" behind Agent Karma. For the "how", see [`architecture.md`](architecture.md) and [`specification.md`](specification.md). For competitive uniqueness, see [`differentiation.md`](differentiation.md).

---

## 1. The problem

AI writes a large and growing share of our code. Adoption is near-universal (84%+ of developers — Stack Overflow 2025). But adoption has outrun **trust and judgment**:

- Only **29% of developers trust AI output**, **66%** say it's "almost right but not quite," and **45%** cite debugging AI-generated code as a top frustration (Stack Overflow 2025). The confidence gap is real and measured.
- Developers routinely accept AI output they never truly validated — untested, unreviewed, unbuilt.
- Every analytics tool on the market answers a *manager's* question ("how much AI is the team using?"), not the *individual's* question ("am I using it well?").

> Note on evidence: an earlier draft led with the 2025 METR "19% slower" trial. METR has since redesigned that experiment (Feb 2026) citing selection-bias concerns and now treats the original result as weak; we therefore lead with the more robust, current Stack Overflow trust-gap data instead.

There is no private, personal mirror that helps a developer build the habit of **validating** AI output and reflecting on their own AI-assisted practice.

## 2. The product

Agent Karma is an **open-source, local-first VS Code extension** — a *personal AI-coding validation & self-awareness coach*. It tracks an AI-assisted session and reflects back, through a Dharma/Karma/Phal lens, whether the work was done with awareness and verification.

**One-liner:** *Agent Karma — every AI action bears fruit. Did you validate yours?*

**Product promise:** *Use any AI coding tool. Agent Karma helps you use it better.*

## 3. Philosophy: Dharma → Karma → Phal

| Concept | Meaning | Captured as |
|---|---|---|
| **Dharma** | Intent, purpose, responsible direction | Dharma Card |
| **Karma** | The actions taken by developer + AI | Karma Trace |
| **Phal** | Outcome, consequence, engineering value | Phal Card + Karma Score |

The whole product compresses to one sentence: **unvalidated Karma bears uncertain Phal.** This is not decoration — it *is* the argument for the validation wedge. An action performed without awareness (validation) yields a fruit you cannot trust.

## 4. Positioning

**Agent Karma IS:** open-source · local-first · developer-owned · tool-agnostic · privacy-safe · coaching-oriented · a personal validation companion.

**Agent Karma is NOT:** another AI coding assistant · a vendor usage dashboard · an enterprise analytics platform · a surveillance tool · a productivity-policing system.

It answers, after a session: **"Did I use AI well in this coding session?"**

## 5. Locked strategic decisions

These are settled. They drive the spec, the scoring, and the roadmap. (See [`differentiation.md`](differentiation.md) for the reasoning and competitive context.)

1. **Core wedge = Validation companion.** "Did you verify the AI's output (tests/build/lint/coverage) before trusting it?" is the hero. Intent and outcome are supporting beats — not co-equal pillars.
2. **Session model = Manual Start/End**, made reliable by mandatory anti-friction features (one-click Status Bar control, forgot-to-start nudge, forgot-to-end safety net, survive-reload, remember-last-tool, immediate value). See [`specification.md`](specification.md) §1.
3. **Karma Score = headline feature, OBJECTIVE & action-based (~90% validation).** Built only from validation *actions* observed or logged (tests/build/lint run, results, test coverage, change measured) — **no feeling-based self-report rows** ("did you review the diff?" is unobservable without surveillance, so it is not scored). Self-comparative, fully transparent. This makes the "we measure real validation" claim literally true. See [`scoring-model.md`](scoring-model.md).
4. **Prompt Quality Score = demoted** to a ≤10%-weight "prompt hygiene hint" — the only non-validation input. A keyword counter must never masquerade as a measure of intent clarity.
5. **Brand = full Dharma/Karma/Phal spiritual theme**, because the metaphor *is* the thesis.
6. **Tool-agnostic = a fact, not a headline USP.** Agent Karma works regardless of where the AI ran (including browser ChatGPT/Claude) because validation signals are tool-independent. The AI-tool tag is a reflection label, not a tracking capability — we state this plainly rather than overselling "log-less coverage."
7. **Forcing function = opt-in pre-commit nudge.** A local, dismissible git hook that surfaces the thesis at the moment of risk ("AI-assisted changes, no tests run — proceed?"). Off by default; the answer to the "vitamin not painkiller" retention risk without betraying the ethos. See [`specification.md`](specification.md) §13.

## 6. Target users

Individual developers, students, open-source contributors, and small teams who use AI coding tools and want to use them *consciously* — without their data leaving their machine. Explicitly **not** engineering managers seeking team ROI dashboards (that market is well served and is not our mission).

## 7. Non-goals (MVP)

No cloud · no login · no telemetry · no team/enterprise features · no Git platform API integrations · no SonarQube/OpenTelemetry · no local-LLM · no React · no database · no automatic prompt capture from AI tools · no source-code or terminal-output capture · no XP/badges/streaks/quizzes/leaderboards · no prompt-quality rules engine.

*Why some of these are off-limits:* XP/quizzes/prompt-rules duplicate Microsoft's AI-Engineering-Coach and dilute our coaching-not-gamification tone; surveillance proxies duplicate CodePause and betray the privacy ethos. We win by being *narrower and more trustworthy*, not broader.

## 8. Success definition (MVP)

The MVP succeeds when a developer can: install locally → start an AI-assisted session (tool + task type + intent) → work normally with any AI tool → see files changed → add/detect validation commands → end the session → review Dharma Card, Karma Trace, Phal Card, and Karma Score → export → delete all data. And it must *feel* **useful, simple, trustworthy, and respectful.**

The deeper success metric (to watch in early feedback): **do users actually start sessions, or forget?** If they forget, the de-risking features need strengthening — or passive detection becomes the fallback.
