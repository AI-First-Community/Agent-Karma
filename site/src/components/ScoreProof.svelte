<script>
  // M0 proof: the REAL engine, running in a browser-hydrated Svelte island.
  // If this builds and renders, the cross-`../extension` reuse boundary works.
  import { calculateKarmaScore } from "../engine/karma";

  const now = "2026-06-13T00:00:00.000Z";
  const events = [
    { id: "1", sessionId: "s", type: "validation.command", timestamp: now,
      data: { commandType: "Test", result: "passed", source: "observed" } },
    { id: "2", sessionId: "s", type: "validation.command", timestamp: now,
      data: { commandType: "Lint", result: "passed", source: "logged" } },
    { id: "3", sessionId: "s", type: "file.saved", timestamp: now,
      data: { fileName: "auth.ts", extension: "ts", isTestFile: false } },
    { id: "4", sessionId: "s", type: "file.saved", timestamp: now,
      data: { fileName: "auth.test.ts", extension: "ts", isTestFile: true } },
  ];

  const result = calculateKarmaScore({ events, gitCaptured: true, promptHintScore: 80 });
</script>

<section style="border:1px solid #d0c8b4;border-radius:12px;padding:20px;background:#fbf6ec">
  <strong>Karma Score: {result.score} — {result.label}</strong>
  <ul style="margin:10px 0 0;padding-left:18px;line-height:1.6">
    {#each result.breakdown ?? [] as r}
      <li style="color:{r.earned ? '#2f7d32' : '#999'}">{r.label}: {r.points}/{r.maxPoints}</li>
    {/each}
  </ul>
</section>
