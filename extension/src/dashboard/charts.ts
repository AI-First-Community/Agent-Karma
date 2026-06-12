// Zero-dependency, CSP-safe chart helpers (pure SVG / HTML — no scripts, no libs).
// Values are treated as a 0–100 scale (Karma scores / percentages).

/** Inline SVG sparkline from a series of 0–100 values. */
export function sparkline(values: number[], width = 130, height = 28): string {
  if (values.length === 0) {
    return "";
  }
  if (values.length === 1) {
    const y = (height - (values[0] / 100) * height).toFixed(1);
    return `<svg class="spark" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" aria-hidden="true"><circle cx="2" cy="${y}" r="2" fill="currentColor"/></svg>`;
  }
  const stepX = width / (values.length - 1);
  const points = values
    .map((v, i) => {
      const clamped = Math.max(0, Math.min(100, v));
      const x = (i * stepX).toFixed(1);
      const y = (height - (clamped / 100) * height).toFixed(1);
      return `${x},${y}`;
    })
    .join(" ");
  // Close the path to the baseline for a soft gradient area fill under the line.
  const area = `0,${height} ${points} ${width},${height}`;
  return `<svg class="spark" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="ak-spark" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="currentColor" stop-opacity="0.28"/><stop offset="100%" stop-color="currentColor" stop-opacity="0"/></linearGradient></defs><polygon points="${area}" fill="url(#ak-spark)" stroke="none"/><polyline points="${points}" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
}

/** A circular Karma gauge (gradient arc + centered number + caption). Pure SVG, CSP-safe. */
export function gauge(score: number, size = 104): string {
  const s = Math.max(0, Math.min(100, Math.round(score)));
  const stroke = 7;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;
  const dash = (s / 100) * circ;
  const base =
    s >= 80
      ? "var(--ak-good)"
      : s >= 60
        ? "var(--ak-info)"
        : s >= 40
          ? "var(--ak-warn)"
          : "var(--ak-risk)";
  // Unique gradient id per score so multiple gauges on a page don't collide.
  const gid = `ak-g-${s}`;
  return `<svg class="gauge" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true">
    <defs><linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${base}" stop-opacity="0.5"/><stop offset="100%" stop-color="${base}"/></linearGradient></defs>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--ak-border)" stroke-width="${stroke}"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="url(#${gid})" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${dash.toFixed(1)} ${circ.toFixed(1)}" transform="rotate(-90 ${cx} ${cy})"/>
    <text x="${cx}" y="${cy - 2}" text-anchor="middle" dominant-baseline="central" class="gauge-num">${s}</text>
    <text x="${cx}" y="${cy + 18}" text-anchor="middle" class="gauge-cap">KARMA</text>
  </svg>`;
}

/**
 * A dharmachakra (spoked wheel) tinted by mood. Pure SVG, CSP-safe; a very slow CSS
 * spin (disabled under prefers-reduced-motion) evokes the turning wheel.
 */
export function chakra(color: string, size = 46): string {
  const c = size / 2;
  const r = size / 2 - 3;
  const hub = 3.2;
  const spokes = Array.from({ length: 12 }, (_, i) => {
    const a = (i * Math.PI) / 6;
    const x1 = (c + hub * Math.cos(a)).toFixed(1);
    const y1 = (c + hub * Math.sin(a)).toFixed(1);
    const x2 = (c + (r - 1.5) * Math.cos(a)).toFixed(1);
    const y2 = (c + (r - 1.5) * Math.sin(a)).toFixed(1);
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="1.2" stroke-linecap="round"/>`;
  }).join("");
  return `<svg class="chakra" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true">
    <circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="${color}" stroke-width="2"/>
    ${spokes}
    <circle cx="${c}" cy="${c}" r="${hub}" fill="${color}"/>
  </svg>`;
}

/** A cell type for the validation-consistency strip. */
export type StreakCell = "good" | "warn" | "risk" | "empty";

/**
 * Validation-consistency strip — one cell per recent session, oldest→latest, colored
 * by outcome. A "contribution graph" for validation DISCIPLINE (no volume info: a row
 * of cells looks identical whether you wrote 3 lines or 3000). `title` gives a native
 * (no-JS) tooltip. CSP-safe.
 */
export function validationStreak(cells: { cell: StreakCell; label: string }[]): string {
  if (cells.length === 0) {
    return "";
  }
  const spans = cells
    .map((c) => `<span class="ak-streak__cell c-${c.cell}" title="${c.label}"></span>`)
    .join("");
  return `<div class="ak-streak" role="img" aria-label="Validation over recent sessions">${spans}</div>`;
}

/**
 * A trend line chart from a series of 0–100 values, with faint gridlines (0/50/100),
 * a soft area fill, and an emphasized end-point. Scales to container width while
 * keeping the end-dot round (uniform aspect). Pure SVG, CSP-safe.
 */
export function trendLine(
  values: number[],
  opts: { color?: string; height?: number } = {}
): string {
  if (values.length === 0) {
    return "";
  }
  const color = opts.color ?? "var(--ak-info)";
  const w = 600;
  const h = opts.height ?? 84;
  const pad = 8;
  const n = values.length;
  const stepX = n > 1 ? (w - pad * 2) / (n - 1) : 0;
  const y = (v: number): number => h - pad - (Math.max(0, Math.min(100, v)) / 100) * (h - pad * 2);
  const xy = values.map((v, i) => [pad + i * stepX, y(v)] as const);
  const pts = xy.map(([x, yy]) => `${x.toFixed(1)},${yy.toFixed(1)}`).join(" ");
  const area = `${pad},${h - pad} ${pts} ${(w - pad).toFixed(1)},${h - pad}`;
  const grid = [0, 50, 100]
    .map(
      (v) =>
        `<line x1="${pad}" y1="${y(v).toFixed(1)}" x2="${w - pad}" y2="${y(v).toFixed(1)}" stroke="var(--ak-hairline)" stroke-width="1"/>`
    )
    .join("");
  const [ex, ey] = xy[xy.length - 1];
  const gid = `ak-tl-${Math.round(values[values.length - 1])}-${n}`;
  const single =
    n === 1 ? `<circle cx="${xy[0][0].toFixed(1)}" cy="${xy[0][1].toFixed(1)}" r="3.5" fill="${color}"/>` : "";
  return `<svg class="trendline" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="trend">
    <defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${color}" stop-opacity="0.22"/><stop offset="100%" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>
    ${grid}
    ${n > 1 ? `<polygon points="${area}" fill="url(#${gid})" stroke="none"/><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>` : ""}
    ${n > 1 ? `<circle cx="${ex.toFixed(1)}" cy="${ey.toFixed(1)}" r="3.5" fill="${color}"/>` : single}
  </svg>`;
}

/** One row of a heatmap: a label plus a cell per column (value 0–100, or null = no data). */
export interface HeatRow {
  label: string;
  cells: { label: string; value: number | null; n: number }[];
}

/**
 * A 2D validation heatmap (rows × columns), color intensity = validation rate. Pure
 * HTML/CSS grid (inline background styles are CSP-allowed). Insight, not activity:
 * cells encode HOW OFTEN you validated, never how much you produced.
 */
export function heatmap(rows: HeatRow[], colLabels: string[]): string {
  if (rows.length === 0) {
    return "";
  }
  const head =
    `<div class="hm-corner"></div>` +
    colLabels.map((c) => `<div class="hm-col">${c}</div>`).join("");
  const body = rows
    .map((r) => {
      const cells = r.cells
        .map((c) => {
          if (c.value === null) {
            return `<div class="hm-cell hm-empty" title="${r.label} · ${c.label}: no data"></div>`;
          }
          const pct = Math.round(c.value);
          const intensity = (8 + (pct / 100) * 74).toFixed(0);
          return `<div class="hm-cell" style="background:color-mix(in srgb, var(--ak-good) ${intensity}%, transparent)" title="${r.label} · ${c.label}: ${pct}% of ${c.n}">${pct}</div>`;
        })
        .join("");
      return `<div class="hm-rowlabel" title="${r.label}">${r.label}</div>${cells}`;
    })
    .join("");
  return `<div class="hm" style="--hm-cols:${colLabels.length}">${head}${body}</div>`;
}

/** A horizontal percent bar (0–100). */
export function percentBar(pct: number): string {
  const p = Math.max(0, Math.min(100, Math.round(pct)));
  return `<span class="bar" role="img" aria-label="${p}%"><span class="bar-fill" style="width:${p}%"></span></span>`;
}

/** A stacked outcome distribution bar from raw counts. */
export function outcomeBar(o: {
  ready: number;
  needs: number;
  highRisk: number;
  informational: number;
}): string {
  const total = o.ready + o.needs + o.highRisk + o.informational;
  if (total === 0) {
    return `<span class="muted">no completed sessions yet</span>`;
  }
  const seg = (count: number, cls: string, label: string): string => {
    if (count === 0) {
      return "";
    }
    const pct = ((count / total) * 100).toFixed(1);
    return `<span class="seg ${cls}" style="width:${pct}%" title="${label}: ${count}"></span>`;
  };
  return `<span class="stack">${seg(o.ready, "seg-ready", "Ready for Review")}${seg(
    o.needs,
    "seg-needs",
    "Needs Review"
  )}${seg(o.highRisk, "seg-high", "High Risk")}${seg(
    o.informational,
    "seg-info",
    "Informational"
  )}</span>`;
}
