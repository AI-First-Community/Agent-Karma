# Scoring Model

> The Karma Score, the prompt hygiene hint, and the Dharma/Phal generation rules. **The Karma Score is OBJECTIVE: it rewards validation *actions* that were observed or logged — never feeling-based self-reports.** Every number here is explainable and traceable to a visible row. This model supersedes Build Spec v1.0 §20/§27.

---

## 1. Design principles

1. **Objective, action-based.** The score is built only from things Agent Karma can point to: validation **commands** that ran (tests/build/lint/type-check), their **results** where known, **test files** changed alongside code, and a **git diff** that was actually captured. There are **no "did you review the diff?" / "did it match your intent?" scored rows** — those are feelings, not actions, and a no-surveillance tool cannot verify them. (They may be captured as *optional, unscored* reflection.)
2. **Validation-dominated (~90%).** The score exists to reward verifying AI output. The only way to raise it is to actually run/observe validation. This makes the README claim — "it measures whether you *verified* the AI's output" — literally true.
3. **Observed > logged.** A command Agent Karma *observed* (with a real exit code via terminal shell integration) earns more than one you merely *logged* via `Agent Karma: Add Validation Command`. Logging keeps the score *fair* when shell integration is unavailable; observation makes it *strong* when it is.
4. **Self-comparative.** Always shown against the user's **own** trailing average with a trend arrow. Never against other developers. Never an absolute "good developer" bar.
5. **Fully transparent.** Tapping the score reveals the exact rows that produced it (the checklist *is* the breakdown). Number and checklist coexist.
6. **Coaching tone.** Labels and language encourage; they never shame. No leaderboards, no streak-pressure.
7. **Task-aware fairness.** Low-risk tasks that don't need tests (Documentation, Explanation) will naturally score low on validation — that is expected and is **not** flagged as a problem (see Phal rules §4). The signal that matters is the trend vs. your own history, not the absolute number.

---

## 2. Prompt hygiene hint (≤10%, deliberately soft, NOT a validation signal)

A **rule-based keyword signal** — explicitly **not** a measure of true prompt quality (a keyword counter can't be). It is the *only* non-validation input to the score and is capped at 10 points.

```
scorePrompt(prompt): { score: number; label: string; reasons: string[] }

Start at 0.
+20 if prompt has more than 5 words
+20 if it contains an action word (fix, create, generate, refactor, explain, test, improve, migrate, document, optimize)
+15 if it contains a context word (file, error, bug, stack trace, requirement, API, function, class, module, service)
+15 if it contains a constraint word (only, avoid, preserve, do not, must, should, without, ensure)
+20 if it contains a validation word (test, build, lint, verify, validate, coverage, regression)
+10 if prompt length is between 50 and 1000 characters
Cap at 100.
```

Label: `0–39 Needs Clarity` · `40–69 Decent` · `70–89 Good` · `90–100 Excellent`.

> ⚠️ **Honest caveat (document in code):** this rewards keyword presence and length, not genuine clarity. It is a *hint*, shown softly on the Dharma Card and worth ≤10% of Karma. Do not let it drive the headline.

---

## 3. Karma Score (0–100, objective & validation-weighted)

```
calculateKarmaScore(session, events): { score: number; label: string; reasons: string[] }
```

| Component | Points | Awarded when (objective condition) |
|---|---:|---|
| **Tests run** | 25 | a `Test` command was **observed or logged** this session |
| **Tests passed** | +10 | a `Test` command has an **observed** result `passed` (requires a real exit code — logging alone does not grant this) |
| **Build / Type Check ran clean** | 20 | a `Build` or `Type Check` command was observed/logged **and none has result `failed`** |
| **Lint ran clean** | 15 | a `Lint` command was observed/logged **and none has result `failed`** |
| **Test coverage of change** | 15 | ≥1 **test file** was saved in a session that also changed ≥1 non-test file |
| **Change measured** | 5 | `gitDiffSummary.captured === true` (we actually measured the change) |
| **Prompt hygiene hint** | up to 10 | `promptHintScore * 0.10` |
| **Total** | **100** | validation rows = **90** (25+10+20+15+15+5) |

**Vacuous-truth rule (important):** the "ran clean" rows award points **only if the command was detected/logged**. A session where no build/lint ran scores **0** for those rows — never the full points for "not having failed." Absence of a command is never treated as success.

**Rounding:** compute the integer score with `Math.round(raw)`. Cap at 100. **Every awarded/withheld point becomes a `reason` string** rendered in the dashboard's "why this score" list.

**Labels:** `0–39 Needs Attention` · `40–59 Improving` · `60–79 Good` · `80–100 Strong`.

**Tone rule (enforced):**
- ✅ Use: *"Good progress. Consider adding a lint run before committing next time."*
- ❌ Never: *"Poor performance." / "You failed." / "Bad productivity."*

### 3.1 Why there is no "diff reviewed" or "outcome matched" row
Both are unobservable without surveillance (which we refuse) or self-report (which is gameable and contradicts an objective score). We therefore **do not score them.** A session may optionally capture an *unscored* reflection note ("I reviewed the diff: yes/no", "outcome matched: yes/partly/no") for the user's own journaling and the Markdown export — but it contributes **0 points** and is clearly labeled as reflection, not measurement.

### 3.2 Fairness when auto-detection misses
Terminal shell integration is unreliable across shells/prompts (see architecture risks). So:
- The **manual** `Agent Karma: Add Validation Command` always exists; logged commands earn the base "ran" points.
- At session end, the prompt is **"Did you run tests / build / lint? Add them so they count"** — it invites the user to *log the actual commands*, not to answer a yes/no. This keeps the score action-based, not feeling-based.
- Only the **+10 "Tests passed"** bonus requires a real observed exit code, so observation is rewarded without punishing the common case.

### 3.3 Self-comparative presentation
- Maintain a rolling figure = **exponential moving average** of recent Karma Scores, `alpha = 0.3`.
- **First session:** seed the EMA to that session's own score and show trend `→` (no prior history).
- Thereafter show the session score with an arrow vs. the EMA: `↑` if `score - ema > 3`, `↓` if `score - ema < -3`, else `→`.
- Never display a percentile, rank, or any comparison to other people.

### 3.4 UI hierarchy
Lead the card with the **✔/– validation checklist**; render the number as a supporting element with its trend. Until there are ≥5 sessions, emphasize the checklist and keep the number quiet.

---

## 4. Phal Card generation (task-aware)

```
generatePhalCard(session, events, karmaScore): PhalCard
```

```
filesChanged       = count of unique saved non-test files + test files
testFilesChanged   = count of unique saved files where isTestFile = true
validationDetected = true if any command type is Test, Build, Lint, Type Check, or Security
commandsDetected   = list of captured command TYPES (+results) — NOT raw command strings (see privacy)

Outcome (computed AFTER the Karma Score):
- Informational    if filesChanged = 0
                   OR (validationDetected = false AND dharmaCard.expectedValidation = "Not Mentioned"
                       AND dharmaCard.riskLevel = "Low")        ← task didn't need validation; not a problem
- Ready for Review if validationDetected = true AND karmaScore >= 75
- Needs Review     if karmaScore 50–74
- High Risk        if filesChanged > 0 AND validationDetected = false
                       AND NOT the Informational low-risk case above

Recommendations (coaching, never shaming):
- if no validation detected and task is not Low-risk → "Run tests or a build to validate these changes."
- if Bug Fix and no test file changed              → "Consider adding or updating a regression test."
- if no lint command detected                      → "Run lint before committing."
- if git diff summary not captured                 → "Review the git diff manually before committing."
```

---

## 5. Dharma Card generation

```
generateDharmaCard(session, promptHint): DharmaCard

task         = session.title
aiTool       = session.aiTool
intentType   = session.taskType
intentClarity = promptHint.label

contextProvided:                       // single normative definition — specification.md references THIS
- Good    if intent mentions any of {file, error, module, function, API, class, service} AND intent length > 80 chars
- Partial if intent contains at least one of those context words
- None    otherwise

expectedValidation:                    // use EXACT task-type literals from specification.md §4
- Explicit       if intent mentions any of {test, build, lint, verify, validate, coverage, regression}
- Recommended    if taskType ∈ {Bug Fix, Security Fix, Refactoring, Migration, DevOps, Performance Improvement}
- Not Mentioned  otherwise

riskLevel:
- High   for {Security Fix, Migration, DevOps}
- Medium for {Bug Fix, Refactoring, Performance Improvement}
- Low    for {Documentation, Explanation, Test Generation, Architecture, Other}
```

---

## 6. Worked example (final, unambiguous)

```
Intent: "Fix the login failure issue and add a regression test."   (task type: Bug Fix, AI tool: Claude Code)

Prompt hint: >5 words(+20), action "fix"(+20), context "issue"(+15), validation "test"+"regression"(+20),
             length 50–1000(+10) = 85 → "Good"

Session signals (objective):
- 3 files saved; one is auth.service.spec.ts (test file) alongside auth.service.ts (code)  → test coverage ✓
- `npm test` observed via shell integration, exit code 0 → Test run ✓, result passed ✓
- no build/lint/type-check command ran
- git diff --numstat captured (3 files, +48 / -12) → change measured ✓

Karma Score:
  Tests run                 25
  Tests passed (observed)   10
  Build/Type Check clean     0   ← none ran (vacuous-truth rule: not awarded)
  Lint clean                 0   ← none ran
  Test coverage of change   15
  Change measured            5
  Prompt hygiene (85 * 0.10) 8.5
  raw = 63.5 → Math.round → 64 → label "Good"

Phal: validationDetected = true, score 64 (50–74) → "Needs Review"
Recommendation: "Run lint before committing."   (no lint command detected)
```

> Note for implementers: keep the `reasons[]` array in lock-step with the table rows so the dashboard breakdown never drifts from the number. The score is deliberately *not* maxed here — running only tests (not build/lint) leaves real, earnable headroom, which is the coaching point.
