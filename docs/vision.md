# Vision & Question Map

> The destination, the full set of questions Agent Karma will help developers answer, and how we sequence toward it **without losing the validation wedge**. Pairs with [`product-strategy.md`](product-strategy.md) (positioning) and [`competitive-coverage.md`](competitive-coverage.md) (what we deliberately exclude).

---

## 1. The vision (the destination)

Agent Karma's long-term aim is to be the **trusted, local-first companion that helps an individual developer become genuinely self-aware and more effective across the entire arc of AI-assisted work** — from *how they ask*, to *what changed*, to *whether they validated it*, to *whether they're actually growing as an engineer*.

> From **"Did I validate this?"** (today) to **"Am I becoming a more deliberate, capable AI-assisted engineer?"** (destination).

It is holistic in the *questions it helps you reflect on* — and uncompromising in *how* it does so: private, coaching, self-comparative, never surveillance, never usage-policing.

---

## 2. The principle: narrow wedge **now**, broad vision **over time**

Broad vision and a narrow MVP are **not** in conflict — they are different layers:

- **The wedge** (entry point): the one question we nail first, measure rigorously, and are known for → **validation** ("did you verify the AI's output?"). Nobody else owns it.
- **The vision** (destination): the full self-awareness arc across six layers (below).

The sequence: **enter sharp → earn trust + adoption + data → expand deliberately, one layer at a time, never diluting the ethos.**

The failure mode we refuse: delivering the whole breadth at once. That yields no focus, no moat, and a head-on fight with incumbents on their turf (see [`competitive-coverage.md`](competitive-coverage.md)). Breadth is the *roadmap*, not the *MVP*.

---

## 3. The Question Map (the full breadth, made explicit)

**Rigor:** 🟢 measured (objective signal) · 🟡 reflected (light/qualitative) · ⚪ aspirational (not built yet)
**Horizon:** **Now** = shipped in MVP 0.1–0.7 · **Next** = near-term post-MVP · **Later** = vision

| Layer | Question | Horizon | How answered | Rigor |
|---|---|---|---|---|
| **Intent** | Did I ask the AI clearly? | Now | Prompt hygiene hint | 🟡 |
| | Did I provide enough context? | Now | Dharma Card · context provided | 🟡 |
| | Did I set the right scope/intent? | Now | Intent capture (Dharma) | 🟡 |
| | Is my prompting improving over time? | Later | Prompt-hint trend across sessions | ⚪ |
| **Action** | What files changed? | Now | File capture + git diff summary | 🟢 |
| | What did this session consist of? | Now | Karma Trace timeline | 🟢 |
| | What did I do vs. the AI? | Later | *Deliberately limited — no AI-vs-human attribution (no surveillance)* | ⚪ |
| **Validation** *(the wedge)* | Did I verify the AI's output? | Now | Objective Karma Score | 🟢 |
| | Did I run tests / build / lint? | Now | Validation capture | 🟢 |
| | Is there test coverage for the change? | Now | Coverage component of the score | 🟢 |
| **Outcome** | Is it ready to commit / review? | Now | Phal outcome | 🟢 |
| | Did the result match my intent? | Now | Optional unscored reflection | 🟡 |
| | Did I commit AI code without validating? | Now | Opt-in pre-commit nudge | 🟢 |
| | Was my effort proportional to the risk? | Next | Dharma risk ✕ validation cross-check | 🟡→🟢 |
| **Effectiveness** | Was this session effective? | Next | Session summary (validated + outcome-ready) | 🟡 |
| | Where does AI help vs. slow me down? | Later | Per-tool / per-task-type outcome trends | ⚪ |
| **Growth** | Am I getting better, or just more dependent? | Now (partial) → Later | Self-comparative score trend (now) → growth narrative (later) | 🟡 |
| | Am I learning, or copy-pasting? | Later | Cross-session patterns (e.g. validation declining, risk rising) | ⚪ |
| | What's one thing to improve this week? | Next | Weekly reflection (one plain-language nudge) | ⚪→🟡 |

**Read it this way:** the MVP already *touches* every layer, but answers **validation rigorously (🟢)** and the rest **lightly (🟡)** or **not yet (⚪)**. That is the sequencing — not the ceiling.

---

## 4. Horizon roadmap (questions → phases)

- **NOW — MVP (0.1–0.7, shipped):** intent capture, action capture, the **validation wedge (rigorous)**, outcome/Phal, the opt-in pre-commit nudge, and a self-comparative score trend.
- **NEXT — near-term post-MVP:** weekly reflection (one true, useful thing from your own history); effort-vs-risk cross-check; session-effectiveness summary; per-tool / per-task-type trends; richer dashboard charts. *(Maps to `roadmap.md` post-MVP phases 1–4.)*
- **LATER — vision:** the longitudinal **growth** narrative ("am I improving or just more dependent?"); prompting-improvement trend; learning-vs-dependence signals; an optional **local-LLM** prompt coach (still on-device). *(Maps to `roadmap.md` phases 5–10.)*

---

## 5. Guardrails that hold at **every** horizon

Breadth never means abandoning the ethos. As we expand, each new question must still pass these:

1. **Local-first, no cloud, no login, no telemetry, no surveillance.** No keystroke/scroll tracking, no AI-vs-human line attribution.
2. **No usage-volume metrics.** We never add acceptance rates / lines-generated / tokens — the question is always *"did I use AI well,"* never *"how much."*
3. **Coaching, never judgment.** Self-comparative only; no leaderboards.
4. **Reflection before measurement.** Add a new question as *reflection* (🟡) first; promote it to a *measured* signal (🟢) only when there's an honest, objective basis — never invent a fake metric (the prompt hygiene hint stays a hint, never a headline).
5. **The wedge test** (from [`competitive-coverage.md`](competitive-coverage.md)): *does it help a developer reflect & improve, without surveillance, cloud, or usage-tracking?* If not, it stays out.

---

## 6. North star

A developer, after a few months with Agent Karma:

> *"I trust my AI-assisted code more, because Agent Karma turned validation into a habit — and I can actually see that I've gotten better at directing AI."*

**Validation is the door. Deliberate, self-aware AI-assisted engineering is the room.** We lead with the door because it's the one only we can open — but the room is the vision, and the Question Map above is how we furnish it, one honest signal at a time.
