<script>
  // The Validation Dojo player. Scores the player's choices with the REAL engine
  // via buildEvents — so the score and breakdown are exactly what the extension
  // would give.
  import { buildEvents } from "../dojo/buildEvents";
  import { calculateKarmaScore } from "../engine/karma";
  import { record } from "../state/progress";

  let { scenario, id, codeHtml = "" } = $props();

  let intent = $state("");
  let chosen = $state(new Set());
  let addedTest = $state(false);
  let result = $state(null);
  let done = $state(false);

  function toggle(cmd) {
    const next = new Set(chosen);
    next.has(cmd) ? next.delete(cmd) : next.add(cmd);
    chosen = next;
  }

  function validateAndShip() {
    result = calculateKarmaScore(
      buildEvents(scenario, { intent, ranValidations: [...chosen], addedTest })
    );
    const foundAll = scenario.hiddenIssues.every((i) => chosen.has(i.kind));
    if (id) record(id, result.score, foundAll);
    done = true;
    queueMicrotask(() => document.getElementById("dojo-result")?.scrollIntoView({ behavior: "smooth" }));
  }

  function reset() {
    chosen = new Set(); addedTest = false; result = null; done = false; intent = "";
  }

  const caught = $derived(done ? scenario.hiddenIssues.filter((i) => chosen.has(i.kind)) : []);
  const missed = $derived(done ? scenario.hiddenIssues.filter((i) => !chosen.has(i.kind)) : []);
</script>

<div class="dojo">
  <p class="task"><strong>The task you gave the AI:</strong> {scenario.task}</p>
  <p class="muted">The AI produced <code>{scenario.fileName}</code>:</p>
  {#if codeHtml}
    <div class="code">{@html codeHtml}</div>
  {:else}
    <pre><code>{scenario.code}</code></pre>
  {/if}

  <label class="field">
    <span>Restate your intent in your own words (scored live by the real prompt scorer):</span>
    <textarea bind:value={intent} rows="2" placeholder="e.g. Fix the pagination edge case and add a regression test"></textarea>
  </label>

  <p class="q">Before you trust it — what do you check?</p>
  <div class="checks">
    {#each scenario.availableValidations as v}
      <button class="chip" class:on={chosen.has(v.commandType)} onclick={() => toggle(v.commandType)} disabled={done}>
        {chosen.has(v.commandType) ? "✓ " : ""}{v.label}
      </button>
    {/each}
    <button class="chip" class:on={addedTest} onclick={() => (addedTest = !addedTest)} disabled={done}>
      {addedTest ? "✓ " : ""}Add a test alongside
    </button>
  </div>

  {#if !done}
    <button class="ship" onclick={validateAndShip}>Validate &amp; ship →</button>
  {:else}
    <div id="dojo-result" class="result">
      <div class="score">Karma {result.score} · <span>{result.label}</span></div>

      {#if missed.length}
        <div class="verdict bad">⚠ You shipped {missed.length} issue{missed.length > 1 ? "s" : ""} unchecked.</div>
      {:else if scenario.hiddenIssues.length}
        <div class="verdict good">✓ You caught everything — clear-eyed shipping.</div>
      {:else}
        <div class="verdict good">✓ Clean change — and you didn't over-validate.</div>
      {/if}

      {#each caught as i}
        <div class="issue caught"><strong>Caught — {i.title}</strong><br />{i.explanation}</div>
      {/each}
      {#each missed as i}
        <div class="issue missed"><strong>Missed — {i.title}</strong><br />{i.explanation}<br /><em>A {i.kind} check would have caught this.</em></div>
      {/each}

      <details class="breakdown"><summary>Score breakdown (the real rules)</summary>
        <ul>{#each result.breakdown ?? [] as r}<li class:earned={r.earned}>{r.label}: {r.points}/{r.maxPoints}</li>{/each}</ul>
      </details>

      <p class="debrief">{scenario.debrief}</p>
      <div class="after">
        <button class="ship ghost" onclick={reset}>Try again</button>
        <a class="prog" href="/progress/">See your rank & Karma Card →</a>
      </div>
    </div>
  {/if}
</div>

<style>
  .task { font-size:18px; }
  .muted { color:var(--ak-muted); margin:.4rem 0 .3rem; }
  pre { background:var(--ak-bg-2); border:1px solid var(--ak-border); border-radius:10px; padding:16px; overflow:auto; font-size:14px; font-family:var(--ak-mono); }
  .field { display:block; margin:18px 0; }
  .field span { display:block; font-size:14px; color:var(--ak-muted); margin-bottom:6px; }
  textarea { width:100%; background:var(--ak-panel); color:var(--ak-text); border:1px solid var(--ak-border); border-radius:8px; padding:10px; font:inherit; }
  .q { font-weight:700; margin:18px 0 8px; }
  .checks { display:flex; flex-wrap:wrap; gap:10px; }
  .chip { background:var(--ak-panel); color:var(--ak-muted); border:1.5px solid var(--ak-border); border-radius:999px; padding:9px 16px; cursor:pointer; font:inherit; font-weight:600; }
  .chip.on { background:color-mix(in srgb, var(--ak-accent) 16%, transparent); border-color:var(--ak-accent); color:var(--ak-text); }
  .chip:disabled { opacity:.7; cursor:default; }
  .ship { margin-top:22px; background:var(--ak-accent); color:#1a1208; border:none; border-radius:10px; padding:13px 24px; font:inherit; font-weight:800; cursor:pointer; }
  .ship.ghost { background:transparent; border:1.5px solid var(--ak-border); color:var(--ak-muted); margin-top:18px; }
  .after { display:flex; align-items:center; gap:20px; flex-wrap:wrap; }
  .prog { font-weight:700; }
  .result { margin-top:26px; border-top:1px solid var(--ak-border); padding-top:22px; }
  .score { font-size:30px; font-weight:800; }
  .score span { color:var(--ak-accent); }
  .verdict { margin:12px 0 16px; font-weight:700; }
  .verdict.good { color:var(--ak-green); }
  .verdict.bad { color:var(--ak-red); }
  .issue { border-radius:10px; padding:13px 15px; margin:10px 0; font-size:15px; line-height:1.5; }
  .issue.caught { background:color-mix(in srgb, var(--ak-green) 12%, transparent); border:1px solid color-mix(in srgb, var(--ak-green) 35%, transparent); }
  .issue.missed { background:color-mix(in srgb, var(--ak-red) 12%, transparent); border:1px solid color-mix(in srgb, var(--ak-red) 35%, transparent); }
  .breakdown { margin:16px 0; color:var(--ak-muted); }
  .breakdown li { color:var(--ak-faint); } .breakdown li.earned { color:var(--ak-text); }
  .debrief { background:var(--ak-panel); border-left:3px solid var(--ak-accent); padding:14px 16px; border-radius:6px; line-height:1.55; }
</style>
