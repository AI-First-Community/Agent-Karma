# Privacy — The Agent Karma Trust Contract

Agent Karma's entire reason to exist is to help you, privately. Privacy is not a setting here — it is the product. This document is the contract. If the code ever violates it, the code is wrong.

---

## The five promises (hardcoded, not optional)

```
1. Never capture source-code content.
2. Never capture terminal output.
3. Never upload data anywhere.
4. Never send telemetry.
5. Never require a login.
```

There is **no cloud backend**, **no account**, and **no network call** in Agent Karma. The extension works fully offline.

---

## What Agent Karma stores

Only **metadata you could safely paste into a public chat**:

| Stored | Example | Never stored |
|---|---|---|
| Session title & your typed intent | "Fix login failure bug" | The AI prompt's surrounding code |
| AI tool & task type | "Claude Code", "Bug Fix" | — |
| File **names / extensions** | `auth.service.ts`, `.ts` | **File contents** |
| Whether a file looks like a test file | `isTestFile: true` | — |
| Full file **path** (only if you opt in) | `src/auth/auth.service.ts` | — |
| Validation command **type & result** | `Test`, `passed` | **The raw command string** (it can hold paths/hosts/tokens) **and its output (stdout/stderr)** |
| Git diff **summary** (counts only) | `3 files, +48 / -12` | **The actual diff text** |
| Timestamps & a generated score | `10:25`, `Karma 86` | — |

> Note: your **typed intent** and any **notes** are free text — avoid pasting secrets into them, just as you would in any notes app. They stay local and can be deleted at any time.

---

## Where your data lives

All data is written to the extension's local storage folder (VS Code `globalStorageUri`):

```
agent-karma-data/
  sessions.json     ← your sessions
  events.json       ← the per-session event timeline
  settings.json     ← your preferences
  exports/          ← anything you chose to export
```

It is plain JSON. You can open it, read it, back it up, or delete it yourself.

---

## Your controls

- **Export** — `Agent Karma: Export Current Session as JSON` / `as Markdown`. You get a portable copy of *your* data.
- **Delete everything** — `Agent Karma: Delete All Local Data` wipes every file above. No trace remains.
- **Privacy settings** (defaults shown):

```jsonc
{
  "agentKarma.enabled": true,
  "agentKarma.storeFullFilePath": false,   // off by default — only file names are stored
  "agentKarma.captureTerminalCommands": true,  // command TYPE only, never output
  "agentKarma.captureExternalFileChanges": true, // file names of AI/CLI edits — never contents
  "agentKarma.capturePromptText": true,    // your own typed intent only; off to redact
  "agentKarma.enableGitDiffSummary": true,  // counts only, never diff content
  "agentKarma.readClaudeUsage": false      // opt-in; reads Claude Code's LOCAL logs, metadata only
}
// Terminal OUTPUT is never captured — it is hard-wired off, not a toggle.
// The pre-commit nudge is opt-in via the "Install Pre-Commit Nudge" command (a local git hook, no network).
```

> The optional **pre-commit nudge** (off by default) installs a local git hook that reminds you to validate AI-assisted changes before committing. It is entirely local, makes no network calls, never blocks your commit, and can be removed at any time with `Agent Karma: Remove Pre-Commit Nudge`. It never reads or transmits your code.

---

## What we explicitly refuse to do

To be unambiguous, Agent Karma will **never**:

- Log keystrokes, mouse movement, scrolling, or cursor position.
- Measure or police "how thoroughly you reviewed" via surveillance signals.
- Attribute individual lines to "AI vs human."
- Compare you against other developers or publish a leaderboard.
- Send a single byte off your machine.

If you ever find behavior inconsistent with this document, please open an issue — it is a bug, and a serious one.
