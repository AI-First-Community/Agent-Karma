# Security Policy

Agent Karma is a **local-first** VS Code extension. By design it makes **no network calls**, has **no backend**, stores **no source code or terminal output**, and sends **no telemetry**. See [PRIVACY.md](PRIVACY.md) for the full data contract.

## Reporting a vulnerability

If you discover a security or privacy issue — especially anything that could cause Agent Karma to capture source code, capture terminal output, transmit data off the machine, or otherwise break a [Prime Directive](CONTRIBUTING.md#1-the-prime-directives-never-violate) — please report it privately first:

- Open a **GitHub Security Advisory** on the repository (preferred), or
- Open a regular issue **without** sensitive details and ask for a private channel.

Please do not disclose publicly until a fix is available.

## What we consider a security/privacy bug

- Any network request made by the extension.
- Any storage or export of source-code content, diff text, terminal output, or raw command strings.
- Any telemetry, analytics, or "phone-home" behavior.
- Any keystroke/scroll/cursor capture.
- A pre-commit hook that hard-blocks commits, clobbers an existing hook, or is not cleanly removable.

## Supported versions

During pre-1.0 development, only the latest commit on the default branch is supported.
