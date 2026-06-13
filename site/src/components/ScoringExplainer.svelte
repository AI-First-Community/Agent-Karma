<script>
  // A live "how scoring works" explainer. It builds the SAME event shapes the
  // extension records and scores them with the REAL calculateKarmaScore — so the
  // number and breakdown here are exactly what you'd get in a real session. The
  // teaching moment: a test that RAN but FAILED still earns "tests run" (you did
  // the verifying) — it just doesn't earn the "tests passed" bonus.
  import { calculateKarmaScore } from "../engine/karma";

  let ranTests = $state(true);
  let testsPassed = $state(true);
  let buildClean = $state(true);
  let lintClean = $state(false);
  let typeClean = $state(false);
  let addedTest = $state(false);
  let measured = $state(true);
  let promptHint = $state(6);

  const TS = "2026-01-01T00:00:00.000Z";

  // Rebuild events + rescore whenever any control changes (real engine, no fake).
  let result = $derived.by(() => {
    const events = [];
    let id = 0;
    const push = (type, data) =>
      events.push({ id: String(++id), sessionId: "learn", type, timestamp: TS, data });

    push("file.saved", { fileName: "feature.ts", extension: "ts", isTestFile: false });
    if (addedTest) push("file.saved", { fileName: "feature.test.ts", extension: "ts", isTestFile: true });

    const val = (commandType, passed) =>
      push("validation.command", { commandType, result: passed ? "passed" : "failed", source: "observed" });

    if (ranTests) val("Test", testsPassed);
    if (buildClean) val("Build", true);
    if (lintClean) val("Lint", true);
    if (typeClean) val("Type Check", true);

    return calculateKarmaScore({ events, gitCaptured: measured, promptHintScore: promptHint });
  });

  const arc = (score) => {
    // 0–100 → stroke-dashoffset on a 264-circumference ring.
    const c = 264;
    return c - (c * Math.max(0, Math.min(100, score))) / 100;
  };
</script>

<div class="explainer">
  <div class="controls">
    <p class="lead">Toggle what you actually did. The score is computed by the real engine, live.</p>

    <label class="row">
      <input type="checkbox" bind:checked={ranTests} />
      <span>I ran the tests</span>
    </label>
    {#if ranTests}
      <label class="row sub">
        <input type="checkbox" bind:checked={testsPassed} />
        <span>…and they passed <em>(uncheck: a test that ran but failed)</em></span>
      </label>
    {/if}

    <label class="row"><input type="checkbox" bind:checked={buildClean} /><span>Build ran clean</span></label>
    <label class="row"><input type="checkbox" bind:checked={lintClean} /><span>Linter ran clean</span></label>
    <label class="row"><input type="checkbox" bind:checked={typeClean} /><span>Type check ran clean</span></label>
    <label class="row"><input type="checkbox" bind:checked={addedTest} /><span>Added a test alongside the change</span></label>
    <label class="row"><input type="checkbox" bind:checked={measured} /><span>Change was measured (git diff captured)</span></label>

    <label class="slider">
      <span>Prompt clarity hint <strong>{promptHint}</strong> / 10</span>
      <input type="range" min="0" max="10" bind:value={promptHint} />
    </label>
  </div>

  <div class="readout">
    <div class="gauge" style={`--mood:${result.score >= 80 ? "var(--ak-accent)" : result.score >= 50 ? "#d9a441" : "var(--ak-muted)"}`}>
      <svg viewBox="0 0 100 100" width="132" height="132" aria-hidden="true">
        <circle cx="50" cy="50" r="42" fill="none" stroke="var(--ak-border)" stroke-width="8" />
        <circle cx="50" cy="50" r="42" fill="none" stroke="var(--mood)" stroke-width="8"
          stroke-linecap="round" stroke-dasharray="264" stroke-dashoffset={arc(result.score)}
          transform="rotate(-90 50 50)" style="transition:stroke-dashoffset .35s ease" />
      </svg>
      <div class="num"><strong>{result.score}</strong><span>{result.label}</span></div>
    </div>

    <ul class="breakdown">
      {#each result.breakdown as r (r.id)}
        <li class:earned={r.earned}>
          <span class="tick">{r.earned ? "✓" : "·"}</span>
          <span class="lbl">{r.label}</span>
          <span class="pts">{r.points}/{r.maxPoints}</span>
        </li>
      {/each}
    </ul>
  </div>
</div>

<style>
  .explainer {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 28px;
    border: 1px solid var(--ak-border);
    border-radius: 16px;
    padding: 24px;
    background: var(--ak-bg-2);
  }
  @media (max-width: 680px) { .explainer { grid-template-columns: 1fr; } }
  .lead { margin: 0 0 14px; color: var(--ak-muted); font-size: 14px; }
  .row { display: flex; gap: 10px; align-items: baseline; padding: 6px 0; cursor: pointer; }
  .row.sub { margin-left: 26px; color: var(--ak-muted); font-size: 14px; }
  .row em { color: var(--ak-faint); font-style: normal; }
  .row input, .slider input { accent-color: var(--ak-accent); }
  .slider { display: block; margin-top: 14px; }
  .slider span { display: block; font-size: 14px; color: var(--ak-muted); margin-bottom: 6px; }
  .slider input[type="range"] { width: 100%; }
  .readout { display: flex; flex-direction: column; align-items: center; gap: 16px; }
  .gauge { position: relative; display: grid; place-items: center; }
  .gauge .num { position: absolute; text-align: center; line-height: 1.1; }
  .gauge .num strong { font-size: 34px; display: block; }
  .gauge .num span { font-size: 12px; color: var(--ak-muted); }
  .breakdown { list-style: none; margin: 0; padding: 0; width: 100%; font-size: 14px; }
  .breakdown li { display: grid; grid-template-columns: 18px 1fr auto; gap: 8px; padding: 5px 0; color: var(--ak-faint); border-top: 1px solid var(--ak-border); }
  .breakdown li.earned { color: var(--ak-text); }
  .breakdown .tick { color: var(--ak-accent); text-align: center; }
  .breakdown li:not(.earned) .tick { color: var(--ak-border); }
  .breakdown .pts { font-variant-numeric: tabular-nums; color: var(--ak-muted); }
</style>
