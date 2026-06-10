import { describe, it, expect } from "vitest";
import { parseNumstat, getGitDiffSummary } from "./gitCollector";

describe("parseNumstat", () => {
  it("sums added/deleted and counts files", () => {
    const out = "48\t12\tsrc/auth.ts\n5\t0\tsrc/auth.test.ts\n";
    expect(parseNumstat(out)).toEqual({ filesChanged: 2, linesAdded: 53, linesDeleted: 12 });
  });

  it("treats binary ('-') files as zero lines but still counts them", () => {
    const out = "-\t-\timage.png\n10\t2\ta.ts\n";
    expect(parseNumstat(out)).toEqual({ filesChanged: 2, linesAdded: 10, linesDeleted: 2 });
  });

  it("returns zeros for empty output", () => {
    expect(parseNumstat("")).toEqual({ filesChanged: 0, linesAdded: 0, linesDeleted: 0 });
  });
});

describe("getGitDiffSummary", () => {
  it("returns captured:false when there are no folders", async () => {
    const r = await getGitDiffSummary([]);
    expect(r.captured).toBe(false);
    expect(r.filesChanged).toBe(0);
  });

  it("returns captured:false (no crash) for a non-git directory", async () => {
    const r = await getGitDiffSummary(["/nonexistent-path-not-a-repo-xyz"]);
    expect(r.captured).toBe(false);
  });
});
