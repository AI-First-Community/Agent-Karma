import { describe, it, expect } from "vitest";
import { renderKarmaCardSvg, renderKarmaCardPrintHtml } from "./karmaCard";

describe("renderKarmaCardSvg", () => {
  it("produces a 1200x630 self-contained SVG with the brand + stats", () => {
    const svg = renderKarmaCardSvg({
      mood: "steady",
      karma: 72,
      validationRate: 80,
      bestStreak: 11,
      sessions: 24,
      dateLabel: "2026-06-12",
    });
    expect(svg).toContain('width="1200" height="630"');
    expect(svg).toContain("AGENT KARMA");
    expect(svg).toContain("Steady");
    expect(svg).toContain("80%");
    expect(svg).toContain(">11<"); // best streak
    expect(svg).toContain(">24<"); // sessions
    expect(svg).toContain("2026-06-12");
    // self-contained: no external resource refs, no scripts (xmlns namespace aside)
    expect(svg).not.toContain("<image");
    expect(svg).not.toContain("href");
    expect(svg).not.toContain("https://");
    expect(svg).not.toContain("<script");
  });

  it("renders a dignified card even with no data (forming)", () => {
    const svg = renderKarmaCardSvg({ mood: "forming" });
    expect(svg).toContain("Forming");
    expect(svg).toContain("0%");
  });

  it("escapes any angle brackets so the SVG can't be broken", () => {
    const svg = renderKarmaCardSvg({ mood: "luminous", dateLabel: "<x>" });
    expect(svg).not.toContain("<x>");
    expect(svg).toContain("&lt;x&gt;");
  });
});

describe("renderKarmaCardPrintHtml", () => {
  it("is a self-contained, self-explanatory, print-ready page embedding the card", () => {
    const html = renderKarmaCardPrintHtml({ mood: "steady", karma: 72, validationRate: 80, bestStreak: 11, sessions: 24 });
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("@page");
    expect(html).toContain("Save as PDF");
    expect(html).toContain("What this is"); // self-explanatory section
    expect(html).toContain("Validation rate"); // legend
    expect(html).toContain("<svg"); // the card itself
    expect(html).not.toContain("https://"); // fully local
    expect(html).not.toContain("<script");
  });
});
