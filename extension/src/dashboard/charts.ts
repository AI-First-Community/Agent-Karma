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

/** A circular Karma gauge (donut arc + centered number). Pure SVG, CSP-safe. */
export function gauge(score: number, size = 88): string {
  const s = Math.max(0, Math.min(100, Math.round(score)));
  const stroke = 9;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;
  const dash = (s / 100) * circ;
  const color =
    s >= 80
      ? "var(--vscode-charts-green, #388a34)"
      : s >= 60
        ? "var(--vscode-charts-blue, #3794ff)"
        : s >= 40
          ? "var(--vscode-charts-yellow, #b89500)"
          : "var(--vscode-charts-red, #e51400)";
  return `<svg class="gauge" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true">
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--vscode-panel-border)" stroke-width="${stroke}"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${dash.toFixed(1)} ${circ.toFixed(1)}" transform="rotate(-90 ${cx} ${cy})"/>
    <text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central" class="gauge-num">${s}</text>
  </svg>`;
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
