import { describe, it, expect } from "vitest";
import { formatElapsed } from "./time";

const start = "2026-06-10T10:00:00.000Z";
const at = (iso: string) => new Date(iso);

describe("formatElapsed", () => {
  it("renders zero elapsed as 00:00", () => {
    expect(formatElapsed(start, at(start))).toBe("00:00");
  });

  it("renders seconds and minutes as MM:SS", () => {
    expect(formatElapsed(start, at("2026-06-10T10:00:05.000Z"))).toBe("00:05");
    expect(formatElapsed(start, at("2026-06-10T10:01:05.000Z"))).toBe("01:05");
    expect(formatElapsed(start, at("2026-06-10T10:59:59.000Z"))).toBe("59:59");
  });

  it("switches to H:MM:SS past an hour (avoids ambiguous 90:00)", () => {
    expect(formatElapsed(start, at("2026-06-10T11:00:00.000Z"))).toBe("1:00:00");
    expect(formatElapsed(start, at("2026-06-10T11:30:05.000Z"))).toBe("1:30:05");
  });

  it("clamps negative (clock-skew) elapsed to 00:00", () => {
    expect(formatElapsed(start, at("2026-06-10T09:59:00.000Z"))).toBe("00:00");
  });
});
