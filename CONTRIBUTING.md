# Contributing & Development Guide

Thanks for your interest in Agent Karma. This guide is the contract for anyone building it — human contributor or automated tooling. Read it fully before writing code. The project is built **phase by phase, with quality, accuracy, and completeness** — never all at once, never over-engineered.

---

## 0. What you are building

Agent Karma is an **open-source, local-first VS Code extension** that helps an individual developer answer one question after an AI-assisted coding session: **"Did I use AI well — did I validate what it produced before trusting it?"** It is a personal *validation & self-awareness coach*, framed as Dharma (intent) → Karma (action) → Phal (outcome). It is **not** a usage tracker, a vendor dashboard, an enterprise analytics tool, or another AI assistant.

If a proposed change does not serve that one question, it does not belong in the MVP.

---

## 1. The Prime Directives (never violate)

These are absolute. A change that breaks any of these is wrong, no matter how useful:

1. **Local-first only.** No cloud backend, no network calls, no login, no accounts. (The MVP must pass: "no network calls are made.")
2. **No telemetry, ever.** Do not phone home, count installs, or report usage.
3. **No source-code content is ever stored or exported.** Capture metadata only — file *names/paths/extensions*, counts, line *numbers*, command *type* — never file contents or diff text.
4. **No terminal output capture.** Record that a command ran and its type/result (passed/failed), never its stdout/stderr, and never the raw command string.
5. **No surveillance.** No keystroke logging, no scroll/cursor/mouse tracking, no screen-time policing, no "AI-vs-human line attribution."
6. **The developer owns the data.** It lives in plain local JSON they can read, export (JSON + Markdown), and delete completely with one command.
7. **Coaching tone, never judgment.** Score language must encourage ("Consider adding validation next time"), never shame. No leaderboards, no streak-pressure, no cross-developer comparison.

If any task appears to require breaking a Prime Directive, **stop and flag it** rather than implement it.

---

## 2. The Locked Product Decisions (build to these, not to your own instincts)

These were decided deliberately. Do not "improve" them without being asked:

| Topic | Locked decision |
|---|---|
| **Core wedge** | **Validation companion.** "Did you verify the AI's output (tests/build/lint/coverage) before trusting it?" is the hero. Intent & outcome are supporting beats. |
| **Session model** | **Manual Start/End**, but with mandatory anti-friction features (see §3). |
| **Karma Score** | **Headline feature, OBJECTIVE & action-based (~90% validation).** Built ONLY from validation actions observed or logged — tests/build/lint run, results, test coverage, change measured. **NO feeling-based self-report rows** ("diff reviewed?", "outcome matched?" are unobservable → not scored; capture them only as unscored reflection). Observed results (real exit codes) outrank logged ones. Self-comparative, fully transparent. |
| **Prompt Quality Score** | **Demoted** to a ≤10%-weight, visually-soft "prompt hygiene hint" — the only non-validation input. Never a headline driver. |
| **Brand** | **Full Dharma / Karma / Phal theme** across UI and copy. The thesis: *unvalidated Karma (action) bears uncertain Phal (fruit).* |
| **Tool-agnostic** | **A fact, not a headline USP.** Works regardless of where the AI ran (Copilot, Cursor, a Claude Code terminal, a browser ChatGPT tab) because validation signals are tool-independent. The AI-tool tag is a reflection label only. |
| **Forcing function** | **Opt-in pre-commit nudge** (off by default): a local, dismissible git hook surfacing the thesis at commit time. Highest-risk feature → isolated in Release 0.7 with a safe-install spike; must never clobber existing hooks or block a commit. |
| **Storage** | **Local JSON only.** No SQLite, no database in MVP. |
| **Dashboard** | **Simple VS Code Webview.** No React, no heavy framework in MVP. |
| **Language** | **TypeScript.** |

---

## 3. The Manual Session Model — mandatory de-risking (do not skip)

Manual Start/End is the chosen model. Its one weakness is that users forget to start/end. These features are **MVP acceptance criteria, not nice-to-haves**:

1. **One-click Status Bar control is the primary entry point** — `▶ Agent Karma: Start` (idle) / `● Recording MM:SS — End` (active). The Command Palette is secondary; start/end must never require hunting the palette.
2. **"Forgot to start" nudge.** If several files (default ~5) are saved with no active session, show one gentle, dismissible, snoozable prompt. Never auto-start; never nag more than once per idle period.
3. **"Forgot to end" safety net.** After a long idle (default ~30 min), prompt to end (or auto-finalize). Data must never be silently lost.
4. **Active session MUST survive a VS Code reload** (and a hard kill). Persist + flush on every event. Hard requirement.
5. **Remember last AI tool & task type;** pre-fill on next Start.
6. **Deliver value immediately** after the first ended session (Phal Card + Karma Score).

---

## 4. Phase-Wise Build Protocol (how to work)

**Build one release at a time, and within a release, one task at a time.** The ordered task list with files, dependencies, and Done-when checks lives in [`docs/implementation-plan.md`](docs/implementation-plan.md) — that is the work queue. Do not start a release until the previous one is complete and verified; do not start a task until its dependencies are done.

For **every** release/task:

1. **Read** the relevant docs ([`docs/implementation-plan.md`](docs/implementation-plan.md) for the task list, plus [`docs/specification.md`](docs/specification.md), [`docs/architecture.md`](docs/architecture.md), [`docs/scoring-model.md`](docs/scoring-model.md), [`docs/roadmap.md`](docs/roadmap.md)) and this guide before coding.
2. **Implement only that release's scope.** Resist pulling features forward; note anything for later and move on.
3. **Match the architecture** in [`docs/architecture.md`](docs/architecture.md) — file layout, module boundaries, data model. Reuse existing utilities; don't create parallel ways of doing the same thing.
4. **Wrap all I/O (storage, git, terminal) in try/catch.** On failure: friendly message, set the relevant `captured: false`, and **never crash the extension.**
5. **Self-verify against the release's acceptance criteria** in [`docs/roadmap.md`](docs/roadmap.md). Run the extension (F5 / Extension Development Host) and confirm each criterion by observation.
6. **Run the Testing Checklist** items in [`docs/specification.md`](docs/specification.md) §15.
7. **Report**: what files changed, how to run it, what was verified, and the next task. Do not silently exceed scope.

**Definition of Done for a release** = scope built + acceptance criteria observably pass + Prime Directives intact + no regressions + errors handled gracefully.

---

## 5. Engineering Guardrails

1. **Do not over-engineer.** Prefer the simplest thing that satisfies the release. No premature abstraction.
2. **No unnecessary dependencies.** Justify every `package.json` addition. Prefer the VS Code API and Node built-ins (`child_process` for git is usually enough). A CI check fails the build on any runtime dependency or network API in the bundle.
3. **Keep modules small and single-purpose.** Pure logic (scoring, classification, card generation) must be **pure functions** with no side effects, so they're trivially testable.
4. **Comment the *why* for non-obvious logic** (scoring weights, classification heuristics, privacy decisions). Match the surrounding code's style.
5. **Fail safe, not loud.** Git absent, terminal integration unavailable, storage write fails — all degrade gracefully and keep the session usable.
6. **Keep scoring explainable.** Every point in the Karma Score traces to a visible checklist row. No opaque formulas.
7. **Keep privacy rules explicit and centralized** (`privacy/privacyRules.ts`) so they can be audited in one place.
8. **Do not break working functionality** when adding features. Earlier releases' acceptance criteria must keep passing.
9. **Make it easy for contributors** — clear names, small files, obvious extension points.
10. **Independent project.** Agent Karma is a purely individual open-source contribution with **no employer or corporate affiliation**. `package.json` `author`/`publisher`, the Marketplace publisher ID, and the `LICENSE` copyright holder are the individual maintainer; docs describe it as independent. Do not add any company/organization affiliation anywhere.
11. **Clean commit authorship.** Commit messages, PR titles/bodies, and co-authors must be plain and professional, authored solely by the human maintainer. **Do not add AI-tool authorship trailers or co-authors** (e.g. "Generated with …", "Co-Authored-By: <assistant>").

---

## 6. What NOT to build (MVP non-goals — adding these is a bug)

Cloud backend · authentication · team/manager/enterprise dashboards · GitHub/GitLab/Azure DevOps API integration · SonarQube/OpenTelemetry export · local-LLM integration · React dashboard · SQLite/any DB · automatic prompt capture from AI tools · source-code content capture · full terminal output capture · raw command-string storage · token/billing integration · marketplace publishing automation · XP/badges/streaks/quizzes/leaderboards · prompt-quality *rules engine*.

The rejected features and the reasoning behind each are documented in [`docs/competitive-coverage.md`](docs/competitive-coverage.md). When in doubt: **keep the MVP simple.** The first version should help **one** developer answer **one** question.

---

## 7. Quality Bar

Before declaring any release complete, confirm:
- [ ] Scope matches the release definition exactly — nothing more, nothing less.
- [ ] All acceptance criteria observably pass in the Extension Development Host.
- [ ] All seven Prime Directives hold (especially: no network calls, no source content / terminal output / raw command strings stored).
- [ ] Manual-model de-risking features (§3) present for any release that touches sessions.
- [ ] Errors handled gracefully; the extension never crashes the host.
- [ ] Code is simple, commented where non-obvious, and matches [`docs/architecture.md`](docs/architecture.md).
- [ ] The change reads like the rest of the codebase.
- [ ] No employer/corporate affiliation and no AI-authorship trailers anywhere — files, comments, commits, metadata, Marketplace listing.

---

## Local development

```bash
cd extension
npm install
npm run build      # esbuild bundle
npm test           # unit tests
# Press F5 in VS Code to launch the Extension Development Host
```

Heart of the project — keep it on a sticky note: **"Did I use AI well in this coding session?"** Everything we build serves that question or it does not ship.
