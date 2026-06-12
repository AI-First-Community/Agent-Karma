import { describe, it, expect } from "vitest";
import { sparkline, percentBar, outcomeBar, gauge } from "./charts";

describe("gauge", () => {
  it("renders an SVG donut with the clamped score", () => {
    const svg = gauge(62);
    expect(svg).toContain("<svg");
    expect(svg).toContain(">62<");
    expect(svg).toContain("stroke-dasharray");
  });
  it("clamps out-of-range scores", () => {
    expect(gauge(140)).toContain(">100<");
    expect(gauge(-5)).toContain(">0<");
  });
});

describe("sparkline", () => {
  it("is empty for no data", () => {
    expect(sparkline([])).toBe("");
  });
  it("renders a polyline for a series and clamps to 0–100", () => {
    const svg = sparkline([0, 50, 100, 150]); // 150 clamps to 100 (y=0)
    expect(svg).toContain("<polyline");
    expect(svg).toContain('points="');
    expect(svg).not.toContain("NaN");
  });
  it("renders a dot for a single point", () => {
    expect(sparkline([62])).toContain("<circle");
  });
});

describe("percentBar", () => {
  it("clamps and renders a fill width", () => {
    expect(percentBar(70)).toContain("width:70%");
    expect(percentBar(150)).toContain("width:100%");
    expect(percentBar(-5)).toContain("width:0%");
  });
});

describe("outcomeBar", () => {
  it("shows an empty state with no sessions", () => {
    expect(outcomeBar({ ready: 0, needs: 0, highRisk: 0, informational: 0 })).toContain("no completed");
  });
  it("renders proportional segments", () => {
    const html = outcomeBar({ ready: 1, needs: 2, highRisk: 1, informational: 0 });
    expect(html).toContain("seg-ready");
    expect(html).toContain("seg-needs");
    expect(html).toContain("seg-high");
    expect(html).not.toContain("seg-info"); // zero count → no segment
  });
});
