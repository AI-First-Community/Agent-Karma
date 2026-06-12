import { KarmicMood } from "../dashboard/karmicMessage";

// A shareable "Karma Card" — a self-contained SVG celebrating the VALIDATION PRACTICE
// (not a leaderboard rank). Fixed premium palette so it looks identical everywhere it's
// shared. Generated locally; the user chooses whether to post it. No network, no vanity
// volume metrics — only honest validation stats.

export interface KarmaCardInput {
  mood: KarmicMood;
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

  <text x="70" y="250" font-size="96" font-weight="800" fill="${m.color}">${esc(m.label)}</text>
  <text x="74" y="300" font-size="30" font-weight="600" fill="#c9d1d9">Karma ${esc(karma)} · ${vr}% of AI-assisted work validated</text>

  ${stat(74, "VALIDATION RATE", `${vr}%`, "#e6edf3")}
  ${stat(434, "BEST STREAK", `${streak}`, "#e6edf3")}
  ${stat(720, "SESSIONS", `${sessions}`, "#e6edf3")}

  <text x="74" y="582" font-size="30" font-weight="600" font-style="italic" fill="#c9d1d9">“${esc(m.line)}”</text>
  <text x="74" y="610" font-size="18" font-weight="600" letter-spacing="1" fill="#8b949e">validate your AI · agent-karma</text>
  <text x="1126" y="610" text-anchor="end" font-size="18" font-weight="600" fill="#8b949e">${esc(date)}</text>
</svg>`;
}
