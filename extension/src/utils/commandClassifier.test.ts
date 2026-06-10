import { describe, it, expect } from "vitest";
import { classifyCommand } from "./commandClassifier";

describe("classifyCommand", () => {
  it("classifies common commands by keyword", () => {
    expect(classifyCommand("npm test")).toBe("Test");
    expect(classifyCommand("pytest -q")).toBe("Test");
    expect(classifyCommand("npm run build")).toBe("Build");
    expect(classifyCommand("gradle build")).toBe("Build");
    expect(classifyCommand("eslint .")).toBe("Lint");
    expect(classifyCommand("tsc --noEmit")).toBe("Type Check");
    expect(classifyCommand("npm audit")).toBe("Security");
  });

  it("falls back to Other for unrecognized commands", () => {
    expect(classifyCommand("git status")).toBe("Other");
    expect(classifyCommand("ls -la")).toBe("Other");
  });
});
