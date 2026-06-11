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
  return `<svg class="spark" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true"><polyline points="${points}" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
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
