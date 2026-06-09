# Competitive Feature Coverage Map

> Proof that every notable competitor feature was **considered**, and an explicit verdict on each: **Adopt** (we do it), **Adapt** (we do a privacy-safe / validation-focused version), or **Reject** (deliberately excluded, with the reason). This is the opposite of "cover everything" — it is **disciplined curation**. The strength is what we say *no* to. Pairs with [`differentiation.md`](differentiation.md).

---

## The governing principle

> Agent Karma is **not** a union of competitor features. It is a focused validation-and-reflection coach. We adopt only what serves the wedge — *"did you verify the AI's output?"* — and reject anything that (a) duplicates an incumbent we can't out-build, (b) requires surveillance, cloud, or accounts, or (c) turns us into a manager-facing dashboard. **Every rejection below is a feature, not a gap.**

Legend: ✅ **Adopt** · 🟦 **Adapt** (privacy-safe / validation-focused variant) · ❌ **Reject** (deliberate non-goal).

---

## 1. From GitHub Copilot Metrics / Amazon Q / Cursor admin (vendor usage dashboards)

| Competitor feature | Verdict | What Agent Karma does instead / why |
|---|:--:|---|
| Acceptance rate, suggestions accepted | ❌ | Usage metric, manager-facing, says nothing about validation. Not our question. |
| DAU/MAU, engagement trends | ❌ | Team adoption metric; irrelevant to an individual's validation habit. |
| Lines generated / tokens consumed | ❌ | "How much AI" — the exact framing we reject in favor of "did you verify it." |
| Per-language breakdown (Amazon Q) | 🟦 | We capture file extensions locally; a per-language *validation* view is a possible **post-MVP** local stat — never a usage leaderboard. |
| Enterprise/org rollups, admin panel | ❌ | Manager product. Different soul. Hard non-goal. |

## 2. From LinearB / Jellyfish / Faros / DX (productivity platforms)

| Competitor feature | Verdict | Rationale |
|---|:--:|---|
| AI usage ↔ DORA / cycle-time correlation | ❌ | Executive ROI story; cloud SaaS; surveillance-flavored. The philosophical opposite of Agent Karma. |
| Team dashboards & benchmarking | ❌ | We are individual-only. No cross-developer comparison, ever. |

## 3. From Git AI (cross-agent provenance)

| Competitor feature | Verdict | Rationale |
|---|:--:|---|
| Track AI-generated lines through the SDLC | ❌ (as a feature) | Governance/provenance for managers; not personal habit. |
| Vendor-agnostic, works regardless of tool | ✅ | We share this property — validation signals are tool-independent (stated as a *fact*, not oversold). |
| Validation/attestation that code was checked | 🟦 | **Adopted as post-MVP "local validation receipt"** — a source-free, local, developer-owned attestation (hash, not diff). Their version is cloud/team; ours is private/individual. |

## 4. From WakaTime (time & activity tracking)

| Competitor feature | Verdict | Rationale |
|---|:--:|---|
| Effortless **passive** capture | 🟦 | We chose **manual sessions** (deliberate intent capture) + de-risking nudges. Passive detection is the documented **fallback** if retention data shows users forget to start. We respect WakaTime as the UX bar for "effortless." |
| Time-spent dashboards (cloud) | ❌ | Time-centric + cloud. We measure validation, locally. |
| AI prompting time / AI-vs-human lines | ❌ | Usage metric; and "AI-vs-human attribution" is unreliable and borders on surveillance. |

## 5. From Microsoft AI-Engineering-Coach (closest competitor)

| Competitor feature | Verdict | Rationale |
|---|:--:|---|
| Local-first, read-only, no-telemetry | ✅ | Shared core value — we match and arguably exceed (no session-log reading needed). |
| Reads AI **session logs** to analyze | 🟦 | We **don't** depend on logs — we observe validation *actions*, so we also cover browser/log-less AI. Different, on purpose. |
| "Context health" / did-you-give-enough-context | 🟦 | We have a **light** version: the Dharma Card's `contextProvided`. We do **not** build a full context-health engine. |
| 45-rule prompt-quality / anti-pattern engine | ❌ | Microsoft owns this; duplicating it is a losing me-too. We keep only a ≤10% "prompt hygiene hint," clearly soft. |
| XP, achievements, tiers, streaks | ❌ | Gamification is off-tone for a calm reflection tool and duplicates them. Hard non-goal. |
| Quizzes / Learning Center / skill catalog | ❌ | Out of scope; not our wedge; theirs already. |
| Code-review-practices scoring | 🟦 | We reframe "code review" specifically as **validation** (tests/build/lint/coverage) — narrower, objective, measurable. |

## 6. From CodePause (closest local competitor)

| Competitor feature | Verdict | Rationale |
|---|:--:|---|
| Local SQLite, tool-agnostic | 🟦 | We're local-JSON, tool-agnostic. Same spirit, simpler storage. |
| Detects copy-paste / chat workflows | 🟦 | We cover the same ground via explicit session tagging + action observation — **without paste-heuristics or surveillance**. |
| AI-vs-manual code ratio (skill-level targets) | ❌ | Gameable, judgmental, usage-centric. We reject ratios as a headline. |
| "Review quality" from scroll / cursor / focus / edits | ❌ | **The line we will not cross.** This is local *surveillance*. Our entire privacy promise depends on refusing it. |
| Coaching tone, no leaderboards | ✅ | Shared value — we adopt and make it objective. |

## 7. From the broader usage-tracker shelf (AI Usage Tracker, Codex/Claude usage, quota monitors)

| Competitor feature | Verdict | Rationale |
|---|:--:|---|
| Token/quota/cost monitoring | ❌ | Billing/usage; not validation. Saturated shelf; nothing to win there. |
| CSV/usage export for teams | ❌ | Manager-facing. We export *your own* session for *you*. |

---

## What only Agent Karma does (the gaps we fill that nobody covers)

These are **net-new** — present in no competitor:

- ✅ **Objective, action-based validation score** — rewards tests/build/lint/coverage actually run, never a self-rating.
- ✅ **Intent → action → outcome reflection loop** (Dharma / Karma / Phal) for the individual.
- ✅ **Opt-in pre-commit nudge** — the validation thesis surfaced at the *moment of risk*, locally, non-blocking.
- ✅ **Radical no-surveillance posture as the product**, not a setting.

---

## The honest summary

- **Adopted (✅):** local-first, no-telemetry, tool-agnostic-as-fact, coaching tone, vendor-agnostic property — i.e., the *good values* competitors share, made objective.
- **Adapted (🟦):** validation receipt, light context signal, validation-as-the-review-lens, passive-detection-as-fallback, log-less-via-actions — privacy-safe, focused variants of competitor ideas.
- **Rejected (❌):** usage dashboards, acceptance/DAU/token metrics, AI-vs-manual ratios, prompt-rules engines, XP/quizzes/streaks, scroll/cursor/focus surveillance, team/manager analytics, cloud/accounts.

**This is the product.** Not a superset — a **deliberate intersection**. If we ever feel pressure to "add what competitor X has," the test is the wedge: *does it help a developer answer "did I validate the AI's output?" without surveillance, cloud, or judgment?* If not, it stays on the ❌ list — and that discipline is the moat.
