import { describe, it, expect } from "vitest";
import {
  ambientDayKey,
  ambientTitle,
  ambientShouldRollover,
  ambientShouldStart,
} from "./ambient";

describe("ambient helpers", () => {
  it("derives the day key and title", () => {
    expect(ambientDayKey("2026-06-12T15:00:00.000Z")).toBe("2026-06-12");
    expect(ambientTitle("2026-06-12")).toBe("Ambient · 2026-06-12");
  });

  it("rolls over only ambient sessions from a different day", () => {
    const today = "2026-06-12";
    expect(ambientShouldRollover(undefined, today)).toBe(false);
    expect(ambientShouldRollover({ ambient: true, startedAt: "2026-06-11T09:00:00Z" }, today)).toBe(true);
    expect(ambientShouldRollover({ ambient: true, startedAt: "2026-06-12T09:00:00Z" }, today)).toBe(false);
    // a manual session is never rolled over
    expect(ambientShouldRollover({ ambient: false, startedAt: "2026-06-11T09:00:00Z" }, today)).toBe(false);
  });

  it("decides when to auto-start an ambient session", () => {
    const today = "2026-06-12";
    expect(ambientShouldStart(false, undefined, today)).toBe(false); // ambient off
    expect(ambientShouldStart(true, undefined, today)).toBe(true); // nothing active
    expect(ambientShouldStart(true, { ambient: true, startedAt: "2026-06-12T09:00:00Z" }, today)).toBe(false); // today's session exists
    expect(ambientShouldStart(true, { ambient: true, startedAt: "2026-06-11T09:00:00Z" }, today)).toBe(true); // rollover
    expect(ambientShouldStart(true, { ambient: false, startedAt: "2026-06-12T09:00:00Z" }, today)).toBe(false); // manual session active → leave it
  });
});
