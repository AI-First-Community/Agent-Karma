import { KarmicMood } from "../dashboard/karmicMessage";

// A shareable "Karma Card" — a self-contained SVG celebrating the VALIDATION PRACTICE
// (not a leaderboard rank). Fixed premium palette so it looks identical everywhere it's
// shared. Generated locally; the user chooses whether to post it. No network, no vanity
// volume metrics — only honest validation stats.

export interface KarmaCardInput {
  mood: KarmicMood;
  /** Recipient name (resolved locally — git user.name / OS user). */
  name?: string;
  karma?: number;
  validationRate?: number;
  bestStreak?: number;
  sessions?: number;
  dateLabel?: string;
}

const MOOD: Record<KarmicMood, { color: string; label: string; line: string }> = {
  luminous: { color: "#3fb950", label: "Luminous", line: "I write with AI — and I verify every line." },
  steady: { color: "#58a6ff", label: "Steady", line: "I use AI — and I check its work." },
  forming: { color: "#d29922", label: "Forming", line: "Building the habit: validate what the AI writes." },
  dim: { color: "#a371f7", label: "On the Path", line: "Learning to verify my AI-assisted work." },
};

const esc = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** A spoked chakra as an SVG group at (cx,cy). */
function chakraGroup(cx: number, cy: number, r: number, color: string, opacity = 1): string {
  const hub = r * 0.14;
  const spokes = Array.from({ length: 12 }, (_, i) => {
    const a = (i * Math.PI) / 6;
    const x1 = (cx + hub * Math.cos(a)).toFixed(1);
    const y1 = (cy + hub * Math.sin(a)).toFixed(1);
    const x2 = (cx + (r - r * 0.06) * Math.cos(a)).toFixed(1);
    const y2 = (cy + (r - r * 0.06) * Math.sin(a)).toFixed(1);
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${(r * 0.03).toFixed(1)}" stroke-linecap="round"/>`;
  }).join("");
  return `<g opacity="${opacity}"><circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="${(r * 0.05).toFixed(1)}"/>${spokes}<circle cx="${cx}" cy="${cy}" r="${hub}" fill="${color}"/></g>`;
}

function stat(x: number, label: string, value: string, color: string): string {
  return `
    <text x="${x}" y="468" font-size="22" font-weight="700" letter-spacing="2" fill="#8b949e">${esc(label)}</text>
    <text x="${x}" y="520" font-size="54" font-weight="800" fill="${color}">${esc(value)}</text>`;
}

const FONT = `'Manrope','Segoe UI',-apple-system,BlinkMacSystemFont,sans-serif`;

export function renderKarmaCardSvg(i: KarmaCardInput): string {
  const m = MOOD[i.mood];
  const karma = i.karma !== undefined ? `${i.karma}` : "—";
  const vr = i.validationRate ?? 0;
  const streak = i.bestStreak ?? 0;
  const sessions = i.sessions ?? 0;
  const date = i.dateLabel ?? "";
  const name = (i.name ?? "").trim().slice(0, 26);

  const recipient = name
    ? `<text x="70" y="168" font-size="15" font-weight="700" letter-spacing="3" fill="#8b949e">AWARDED TO</text>
  <text x="70" y="210" font-size="42" font-weight="800" fill="#e6edf3">${esc(name)}</text>`
    : "";
  const moodY = name ? 300 : 250;
  const moodSize = name ? 76 : 96;
  const subY = name ? 344 : 300;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" font-family="${FONT}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0d1117"/>
      <stop offset="100%" stop-color="#161b22"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect x="8" y="8" width="1184" height="614" rx="22" fill="none" stroke="${m.color}" stroke-opacity="0.25" stroke-width="2"/>
  ${chakraGroup(1000, 330, 250, m.color, 0.08)}
  ${chakraGroup(78, 78, 26, m.color, 1)}
  <text x="124" y="86" font-size="26" font-weight="800" letter-spacing="3" fill="#e6edf3">AGENT KARMA</text>
  <text x="124" y="112" font-size="16" font-weight="600" letter-spacing="4" fill="#8b949e">KARMA CARD</text>

  ${recipient}
  <text x="70" y="${moodY}" font-size="${moodSize}" font-weight="800" fill="${m.color}">${esc(m.label)}</text>
  <text x="74" y="${subY}" font-size="28" font-weight="600" fill="#c9d1d9">Karma ${esc(karma)} · ${vr}% of AI-assisted work validated</text>

  ${stat(74, "VALIDATION RATE", `${vr}%`, "#e6edf3")}
  ${stat(434, "BEST STREAK", `${streak}`, "#e6edf3")}
  ${stat(720, "SESSIONS", `${sessions}`, "#e6edf3")}

  <text x="74" y="582" font-size="30" font-weight="600" font-style="italic" fill="#c9d1d9">“${esc(m.line)}”</text>
  <text x="74" y="610" font-size="18" font-weight="600" letter-spacing="1" fill="#8b949e">validate your AI · agent-karma</text>
  <text x="1126" y="610" text-anchor="end" font-size="18" font-weight="600" fill="#8b949e">${esc(date)}</text>
</svg>`;
}

/**
 * A self-explanatory, print-ready HTML page wrapping the card — for "Save as PDF"
 * from the browser (⌘P). It explains what Agent Karma is and what each stat means,
 * so the printed certificate stands on its own. Fully self-contained: no network.
 */
export function renderKarmaCardPrintHtml(i: KarmaCardInput): string {
  const svg = renderKarmaCardSvg(i);
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8" /><title>Agent Karma — Karma Card</title>
<style>
  @page { size: A4 landscape; margin: 12mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: 'Manrope','Segoe UI',-apple-system,BlinkMacSystemFont,sans-serif; color: #1a1f24; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .wrap { max-width: 1040px; margin: 0 auto; padding: 18px; }
  .print-hint { text-align: center; font-size: 12px; color: #8a8a8a; margin-bottom: 12px; }
  .card { border-radius: 16px; overflow: hidden; box-shadow: 0 4px 22px rgba(0,0,0,0.16); }
  .card svg { width: 100%; height: auto; display: block; }
  h2 { font-size: 17px; margin: 22px 0 6px; letter-spacing: -0.01em; }
  p { font-size: 13px; line-height: 1.6; color: #3a4149; margin: 6px 0; }
  .legend { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-top: 14px; }
  .legend div { font-size: 12px; color: #3a4149; }
  .legend b { display: block; color: #0e1117; margin-bottom: 2px; }
  .foot { margin-top: 18px; padding-top: 9px; border-top: 1px solid #e8e8e8; font-size: 11px; color: #8a8a8a; }
  @media print { .print-hint { display: none; } }
</style></head>
<body><div class="wrap">
  <div class="print-hint">Press ⌘P (macOS) or Ctrl+P → “Save as PDF”.</div>
  <div class="card">${svg}</div>
  <h2>What this is</h2>
  <p><b>Agent Karma</b> is a local-first VS Code tool that measures one thing: did you verify the AI's output — by running tests, builds, and linters — <i>before</i> trusting it? This card reflects your <b>validation practice</b>, not how much AI you use.</p>
  <div class="legend">
    <div><b>Validation rate</b> Share of recent sessions in which you ran a real check (test / build / lint).</div>
    <div><b>Best streak</b> The most consecutive sessions you validated in a row.</div>
    <div><b>Karma mood</b> Your self-comparative Karma band — luminous, steady, forming, or on the path.</div>
  </div>
  <div class="foot">Generated locally by Agent Karma — no data left this machine. · validate your AI · agent-karma</div>
</div></body></html>`;
}
