<script>
  import { onMount } from "svelte";
  import { stats, reset } from "../state/progress";
  import { buildKarmaCardSvg } from "../state/card";

  const base = import.meta.env.BASE_URL; // project-site subpath, e.g. "/Agent-Karma/"

  let s = $state(null);
  let name = $state("");
  let svg = $state("");

  function refresh() {
    s = stats();
    svg = s.completedCount ? buildKarmaCardSvg(name) : "";
  }

  onMount(() => {
    name = localStorage.getItem("agentKarma.site.cardName") || "";
    refresh();
  });

  function onName() {
    localStorage.setItem("agentKarma.site.cardName", name);
    if (s?.completedCount) svg = buildKarmaCardSvg(name);
  }

  function download() {
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "agent-karma-card.svg";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function doReset() {
    if (confirm("Clear your local Dojo progress? This can't be undone.")) {
      reset();
      refresh();
    }
  }
</script>

{#if !s}
  <p class="muted">Loading…</p>
{:else if s.completedCount === 0}
  <p class="muted">No Dojo runs yet. Play a scenario to earn your rank and a Karma Card.</p>
  <p><a class="cta" href={`${base}dojo/`}>Enter the Dojo →</a></p>
{:else}
  <div class="rank">{s.rank}</div>
  <div class="grid">
    <div><b>{s.completedCount}</b><span>scenarios</span></div>
    <div><b>{s.avgKarma}</b><span>avg Karma</span></div>
    <div><b>{s.cleanRate}%</b><span>clean sweeps</span></div>
  </div>

  <label class="field">
    <span>Name on your card</span>
    <input bind:value={name} oninput={onName} placeholder="Your name" />
  </label>

  <div class="card">{@html svg}</div>

  <div class="actions">
    <button class="btn primary" onclick={download}>⤓ Download SVG</button>
    <a class="btn" href={`${base}dojo/`}>Play more →</a>
    <button class="btn ghost" onclick={doReset}>Reset progress</button>
  </div>
  <p class="note">100% local — your progress and card never leave this browser.</p>
{/if}

<style>
  .muted { color: var(--ak-muted); }
  .cta { font-weight: 700; }
  .rank { font-size: 30px; font-weight: 800; color: var(--ak-accent); }
  .grid { display: flex; flex-wrap: wrap; gap: clamp(18px, 6vw, 28px); margin: 14px 0 24px; }
  .grid div { display: flex; flex-direction: column; }
  .grid b { font-size: 28px; font-weight: 800; }
  .grid span { font-size: 13px; color: var(--ak-muted); text-transform: uppercase; letter-spacing: 1px; }
  .field { display: block; margin: 0 0 18px; max-width: 320px; }
  .field span { display: block; font-size: 14px; color: var(--ak-muted); margin-bottom: 6px; }
  input { width: 100%; background: var(--ak-panel); color: var(--ak-text); border: 1px solid var(--ak-border); border-radius: 8px; padding: 9px 11px; font: inherit; }
  .card { max-width: 640px; border-radius: 14px; overflow: hidden; box-shadow: 0 14px 44px rgba(0,0,0,.4); }
  .card :global(svg) { display: block; width: 100%; height: auto; }
  .actions { display: flex; flex-wrap: wrap; gap: 12px; margin: 22px 0 8px; }
  .btn { font: inherit; font-weight: 700; border-radius: 9px; padding: 11px 18px; cursor: pointer; text-decoration: none; border: 1.5px solid var(--ak-border); background: transparent; color: var(--ak-text); }
  .btn.primary { background: var(--ak-accent); color: #1a1208; border: none; }
  .btn.ghost { color: var(--ak-muted); }
  .note { color: var(--ak-faint); font-size: 13px; margin-top: 10px; }
  @media (max-width: 540px) {
    .rank { font-size: 26px; }
    .grid b { font-size: 24px; }
    .actions .btn { flex: 1 1 auto; text-align: center; }
  }
</style>
