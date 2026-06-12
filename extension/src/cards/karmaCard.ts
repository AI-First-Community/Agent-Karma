import { KarmicMood } from "../dashboard/karmicMessage";

// A shareable "Karma Card" — a self-contained SVG certificate celebrating the
// VALIDATION PRACTICE (not a leaderboard rank). Fixed premium palette so it looks
// identical everywhere it's shared/printed. Generated locally; the user chooses whether
// to post it. No network, no vanity volume metrics — only honest validation stats.

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

const MOOD: Record<KarmicMood, { color: string; credential: string; line: string }> = {
  luminous: { color: "#3fb950", credential: "Luminous Validator", line: "I write with AI — and I verify every line." },
  steady: { color: "#58a6ff", credential: "Steady Validator", line: "I use AI — and I check its work." },
  forming: { color: "#d29922", credential: "Forming Validator", line: "Building the habit: validate what the AI writes." },
  dim: { color: "#a371f7", credential: "On the Path", line: "Learning to verify my AI-assisted work." },
};

const W = 1200;
const H = 850;
const CX = W / 2;
const FONT = `'Manrope','Segoe UI',-apple-system,BlinkMacSystemFont,sans-serif`;

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

/** A wax-seal-style medallion: concentric rings around a chakra. */
function seal(cx: number, cy: number, color: string): string {
  return `<circle cx="${cx}" cy="${cy}" r="48" fill="#0d1117" stroke="${color}" stroke-width="1.5" opacity="0.85"/>
  <circle cx="${cx}" cy="${cy}" r="41" fill="none" stroke="${color}" stroke-width="1" opacity="0.4"/>
  ${chakraGroup(cx, cy, 29, color, 0.95)}`;
}

/** A centered stat column (big value over a small caption). */
function stat(cx: number, label: string, value: string): string {
  return `<text x="${cx}" y="588" text-anchor="middle" font-size="46" font-weight="800" fill="#ffffff">${esc(value)}</text>
  <text x="${cx}" y="622" text-anchor="middle" font-size="15" font-weight="700" letter-spacing="2" fill="#8b949e">${esc(label)}</text>`;
}

/** Small mood-colored corner accent (two short strokes forming an L). */
function corner(x: number, y: number, dx: number, dy: number, color: string): string {
  const L = 26;
  return `<path d="M ${x} ${y + dy * L} L ${x} ${y} L ${x + dx * L} ${y}" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" opacity="0.7"/>`;
}

export function renderKarmaCardSvg(i: KarmaCardInput): string {
  const m = MOOD[i.mood];
  const karma = i.karma !== undefined ? `${i.karma}` : "—";
  const vr = i.validationRate ?? 0;
  const streak = i.bestStreak ?? 0;
  const sessions = i.sessions ?? 0;
  const date = i.dateLabel ?? "";
  const name = (i.name ?? "").trim().slice(0, 24) || "A Mindful Developer";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${FONT}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0d1117"/>
      <stop offset="55%" stop-color="#11161d"/>
      <stop offset="100%" stop-color="#161b22"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="42%" r="55%">
      <stop offset="0%" stop-color="${m.color}" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="${m.color}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="flo" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${m.color}" stop-opacity="0"/>
      <stop offset="50%" stop-color="${m.color}" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="${m.color}" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>
  ${chakraGroup(CX, 430, 300, m.color, 0.04)}

  <rect x="28" y="28" width="${W - 56}" height="${H - 56}" rx="20" fill="none" stroke="${m.color}" stroke-width="2.5" stroke-opacity="0.6"/>
  <rect x="46" y="46" width="${W - 92}" height="${H - 92}" rx="13" fill="none" stroke="${m.color}" stroke-width="1" stroke-opacity="0.22"/>
  ${corner(60, 60, 1, 1, m.color)}${corner(W - 60, 60, -1, 1, m.color)}${corner(60, H - 60, 1, -1, m.color)}${corner(W - 60, H - 60, -1, -1, m.color)}

  <text x="${CX}" y="120" text-anchor="middle" font-size="25" font-weight="800" letter-spacing="9" fill="#e6edf3">AGENT KARMA</text>
  <line x1="${CX - 70}" y1="140" x2="${CX + 70}" y2="140" stroke="${m.color}" stroke-width="1.5" stroke-opacity="0.6"/>
  <text x="${CX}" y="168" text-anchor="middle" font-size="15" font-weight="700" letter-spacing="6" fill="#8b949e">VALIDATION PRACTICE CARD</text>

  <text x="${CX}" y="262" text-anchor="middle" font-size="26" font-style="italic" fill="#c9d1d9">This certifies that</text>
  <text x="${CX}" y="338" text-anchor="middle" font-size="66" font-weight="800" fill="#ffffff">${esc(name)}</text>
  <rect x="${CX - 220}" y="364" width="440" height="3" rx="1.5" fill="url(#flo)"/>
  <text x="${CX}" y="424" text-anchor="middle" font-size="33" font-weight="700" fill="${m.color}">${esc(m.credential)}</text>
  <text x="${CX}" y="476" text-anchor="middle" font-size="24" font-style="italic" fill="#c9d1d9">“${esc(m.line)}”</text>

  <line x1="350" y1="556" x2="350" y2="628" stroke="${m.color}" stroke-width="1" stroke-opacity="0.18"/>
  <line x1="600" y1="556" x2="600" y2="628" stroke="${m.color}" stroke-width="1" stroke-opacity="0.18"/>
  <line x1="850" y1="556" x2="850" y2="628" stroke="${m.color}" stroke-width="1" stroke-opacity="0.18"/>
  ${stat(225, "KARMA", karma)}
  ${stat(475, "VALIDATION", `${vr}%`)}
  ${stat(725, "BEST STREAK", `${streak}`)}
  ${stat(975, "SESSIONS", `${sessions}`)}

  ${seal(CX, 706, m.color)}

  <text x="72" y="788" font-size="17" font-weight="600" fill="#8b949e">${esc(date)}</text>
  <text x="${W - 72}" y="788" text-anchor="end" font-size="17" font-weight="600" letter-spacing="1" fill="#8b949e">validate your AI · agent-karma</text>
</svg>`;
}

/**
 * A self-explanatory, print-ready HTML page wrapping the certificate — for "Save as PDF"
 * from the browser (⌘P). It explains what Agent Karma is and what each stat means, so the
 * printed certificate stands on its own. Fully self-contained: no network.
 */
export function renderKarmaCardPrintHtml(i: KarmaCardInput): string {
  const svg = renderKarmaCardSvg(i);
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8" /><title>Agent Karma — Karma Card</title>
<style>
  @page { size: A4 landscape; margin: 10mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: 'Manrope','Segoe UI',-apple-system,BlinkMacSystemFont,sans-serif; color: #1a1f24; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .wrap { max-width: 1080px; margin: 0 auto; padding: 16px; }
  .print-hint { text-align: center; font-size: 12px; color: #8a8a8a; margin-bottom: 12px; }
  .card { border-radius: 18px; overflow: hidden; box-shadow: 0 6px 28px rgba(0,0,0,0.18); }
  .card svg { width: 100%; height: auto; display: block; }
  h2 { font-size: 16px; margin: 20px 0 6px; letter-spacing: -0.01em; }
  p { font-size: 12.5px; line-height: 1.6; color: #3a4149; margin: 6px 0; }
  .legend { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 12px; }
  .legend div { font-size: 11.5px; color: #3a4149; }
  .legend b { display: block; color: #0e1117; margin-bottom: 2px; }
  .foot { margin-top: 14px; padding-top: 8px; border-top: 1px solid #e8e8e8; font-size: 11px; color: #8a8a8a; }
  @media print { .print-hint { display: none; } }
</style></head>
<body><div class="wrap">
  <div class="print-hint">Press ⌘P (macOS) or Ctrl+P → “Save as PDF”.</div>
  <div class="card">${svg}</div>
  <h2>What this is</h2>
  <p><b>Agent Karma</b> is a local-first VS Code tool that measures one thing: did you verify the AI's output — by running tests, builds, and linters — <i>before</i> trusting it? This certificate reflects your <b>validation practice</b>, not how much AI you use.</p>
  <div class="legend">
    <div><b>Karma</b> Your objective, self-comparative validation score.</div>
    <div><b>Validation rate</b> Share of recent sessions in which you ran a real check.</div>
    <div><b>Best streak</b> The most consecutive sessions you validated in a row.</div>
    <div><b>Sessions</b> AI-assisted sessions you've reflected on.</div>
  </div>
  <div class="foot">Generated locally by Agent Karma — no data left this machine. · validate your AI · agent-karma</div>
</div></body></html>`;
}
