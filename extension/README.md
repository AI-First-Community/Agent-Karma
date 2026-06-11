# Agent Karma

**Make every agent action count.**

A local-first, privacy-safe VS Code companion that helps you reflect on whether you **validated** AI-generated code before trusting it. Framed as Dharma (intent) → Karma (action) → Phal (outcome).

- **Local-first** — no cloud, no login, no telemetry, no source-code or terminal-output capture.
- **Validation-focused** — coaches you toward running tests / build / lint and reviewing the diff.
- **Tool-agnostic** — works with Claude Code, Copilot, Cursor, ChatGPT, and others.

> Pre-release. See the [project repository](https://github.com/Passion4Architecture/agent-karma) for full documentation, the roadmap, and the privacy contract.

## Usage

- Click **▶ Agent Karma: Start** in the status bar to begin a session (title, AI tool, task type, intent).
- Work normally with your AI tool; save files and run tests/build/lint.
- Click **● Recording … — End** to finish; open the dashboard to review your Karma Score and Phal outcome.

## Commands

- **Agent Karma: Start Session** / **End Session**
- **Agent Karma: Show Dashboard**
- **Agent Karma: Add Validation Command** — log a test/build/lint command you ran
- **Agent Karma: Export Current Session as JSON** / **as Markdown**
- **Agent Karma: Delete All Local Data** — wipes everything, permanently

All data stays in plain local JSON you can export or delete at any time.

Licensed under Apache-2.0.
