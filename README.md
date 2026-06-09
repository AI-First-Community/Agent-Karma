# Agent Karma

### Make every agent action count.

**Agent Karma** is an open-source, local-first VS Code extension that helps developers understand and improve **how they use AI coding tools** — Claude Code, GitHub Copilot, Cursor, ChatGPT, Windsurf, Gemini CLI, Codex CLI, and others.

It is **not** another AI coding assistant. It is **not** an enterprise analytics dashboard. It is **not** a surveillance tool.

It is a personal companion that helps you answer one question after every AI-assisted session:

> ## Did I use AI well — did I validate what it produced before I trusted it?

---

## Why Agent Karma exists

AI now writes a large share of our code: **84% of developers** use or plan to use AI coding tools (Stack Overflow 2025). Yet only **29% trust the output**, **66%** say AI answers are "almost right but not quite," and **45%** find debugging AI-generated code a top frustration. We ship code we never really checked.

Every existing tool measures AI usage **for managers**: acceptance rates, lines generated, tokens consumed, team ROI. None of them help **you** notice whether *you* validated the AI's work before shipping it.

Agent Karma closes that gap. It is the mirror, not the dashboard.

---

## The philosophy: Dharma → Karma → Phal

Agent Karma is built on a simple idea: **every action has a consequence.**

| Concept | Meaning | In Agent Karma |
|---|---|---|
| **Dharma** | Intent, purpose, direction | What you asked the AI to do |
| **Karma** | Action | The changes you and the AI actually made |
| **Phal** | Outcome, fruit, consequence | Whether the result is validated and ready |

The thesis in one line: **unvalidated Karma bears uncertain Phal.** An action you never verified produces a fruit you can't trust. Agent Karma helps you notice the difference.

---

## What it does (MVP)

For each AI-assisted coding session, Agent Karma produces:

- 🪔 **Dharma Card** — your intent, prompt clarity, expected validation, and risk level
- 🔗 **Karma Trace** — a chronological, privacy-safe timeline of what happened (files saved, validation commands run, git diff summary)
- 🍃 **Phal Card** — the outcome: files changed, tests/build/lint detected, and whether it's ready for commit or review
- ⚖️ **Karma Score** — an **objective, transparent** score built only from the validation **actions** you actually took (tests/build/lint run, test coverage, change measured) — never a vague self-rating. Every point is explained.
- 🛡️ **Pre-commit nudge** *(opt-in)* — a local git hook that reminds you to validate AI-assisted changes *before* you commit them
- 📤 **Export** — your session as JSON or Markdown
- 🗑️ **Delete everything** — one command wipes all local data

Everything is stored as plain JSON on your machine.

---

## What makes it unique

Agent Karma is the **only** tool that combines all of these:

- ✅ **Validation-first** — it measures whether you *verified* the AI's output (the actions you took: tests/build/lint/coverage), not how much code it generated. No competitor centers this.
- ✅ **Radically private** — no cloud, no login, no telemetry, no source upload, no terminal-output capture, no keystroke/scroll surveillance. This is the part incumbents structurally won't copy.
- ✅ **Coaching, not judgment** — objective, self-comparative, transparent, encouraging. No leaderboards.
- ✅ **Developer-owned** — readable local JSON, full export, one-click delete.

And it's **tool-agnostic by nature**: it works the same whether your AI ran in Copilot, Cursor, a Claude Code terminal, or a browser ChatGPT tab — because it watches your *validation actions*, which don't care where the code came from.

See [`docs/differentiation.md`](docs/differentiation.md) for the full comparison against GitHub Copilot Metrics, Microsoft's AI-Engineering-Coach, CodePause, Git AI, WakaTime, and more.

---

## Privacy promise

```
Local-first. No source code captured. No terminal output captured.
No cloud upload. No telemetry. No login. No surveillance.
```

Read the full contract in [`PRIVACY.md`](PRIVACY.md).

---

## Project status

🚧 **Pre-release.** Building incrementally, one release at a time (0.1 → 0.6). See [`docs/roadmap.md`](docs/roadmap.md).

## Documentation

| Doc | What's in it |
|---|---|
| [`docs/product-strategy.md`](docs/product-strategy.md) | Positioning, philosophy, locked decisions, non-goals |
| [`docs/differentiation.md`](docs/differentiation.md) | USPs and full competitive comparison |
| [`docs/specification.md`](docs/specification.md) | Functional spec — sessions, cards, commands, capture, testing |
| [`docs/architecture.md`](docs/architecture.md) | Architecture, folder structure, data model |
| [`docs/scoring-model.md`](docs/scoring-model.md) | Karma Score, prompt hygiene hint, Dharma/Phal generation |
| [`docs/roadmap.md`](docs/roadmap.md) | Phase-wise release plan with acceptance criteria |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | Build rules & phase-wise protocol for contributors |

## License

Open source (license TBD — see `LICENSE`). A purely individual, community contribution. Not affiliated with any employer or vendor.

---

*Use any AI coding tool. Agent Karma helps you use it better.*
