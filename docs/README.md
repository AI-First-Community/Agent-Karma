# Agent Karma — Documentation

This folder holds the complete thinking and design for Agent Karma. Read in this order before building.

| # | Document | Purpose |
|---|---|---|
| 1 | [product-strategy.md](product-strategy.md) | The problem, philosophy (Dharma/Karma/Phal), positioning, **locked decisions**, non-goals |
| 2 | [differentiation.md](differentiation.md) | **USPs and full competitive comparison** — why Agent Karma is uniquely positioned |
| 2b | [competitive-coverage.md](competitive-coverage.md) | **Feature-by-feature verdict** on every competitor capability — Adopt / Adapt / Reject (deliberate non-goals) |
| 3 | [specification.md](specification.md) | Functional spec — session lifecycle, commands, capture rules, cards, dashboard, testing checklist |
| 4 | [architecture.md](architecture.md) | High-level architecture, folder structure, full data model, error handling |
| 5 | [scoring-model.md](scoring-model.md) | Karma Score (validation-weighted), prompt hygiene hint, Dharma/Phal generation rules |
| 6 | [roadmap.md](roadmap.md) | **Phase-wise release plan** (0.1 → 0.7) with acceptance criteria |
| 7 | [implementation-plan.md](implementation-plan.md) | **Task-by-task build sequence** — foundation-first, ordered tasks with files, dependencies, and Done-when checks |

## Also in the repo root

| Document | Purpose |
|---|---|
| [../CONTRIBUTING.md](../CONTRIBUTING.md) | **Build rules & phase-wise protocol** — read first if you are implementing |
| [../README.md](../README.md) | Public-facing project overview and USPs |
| [../PRIVACY.md](../PRIVACY.md) | The privacy trust contract |

## The one sentence that governs everything

> **Unvalidated Karma bears uncertain Phal.** Agent Karma helps a developer answer, after each AI-assisted session: *"Did I use AI well — did I validate what it produced before I trusted it?"*

## Status

Pre-development. Design complete; ready to build **Release 0.1** per [roadmap.md](roadmap.md), following [../CONTRIBUTING.md](../CONTRIBUTING.md).

## Source materials

- These documents refine an original 30-page Build Specification (a local working artifact, not part of the repository).
- The independent strategy review and competitive research that produced these decisions are summarized across documents 1–2.
