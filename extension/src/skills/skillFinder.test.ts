import { describe, it, expect } from "vitest";
import { findSkills, SkillFinderInput } from "./skillFinder";
import { ReadinessSignals } from "../collectors/validationReadiness";

const FULL_SIGNALS: ReadinessSignals = {
  testScript: true, testDep: true, testConfigFile: true,
  buildScript: true, tsconfig: true,
  lintScript: true, lintConfig: true, lintDep: true,
  typecheckScript: true,
  ci: true, preCommit: true, agentMentionsValidation: true,
};

const base = (over: Partial<SkillFinderInput>): SkillFinderInput => ({
  recentCount: 10,
  skipRates: [],
  signals: { ...FULL_SIGNALS },
  preCommitInstallable: true,
  ...over,
});

describe("findSkills", () => {
  it("leads with a one-click pre-commit net when a check is often skipped and no hook exists", () => {
    const s = findSkills(
      base({
        skipRates: [{ type: "Lint", skipRate: 60 }],
        signals: { ...FULL_SIGNALS, preCommit: false },
      })
    );
    expect(s[0].id).toBe("precommit-net");
    expect(s[0].severity).toBe("high");
    expect(s[0].action).toEqual({ kind: "install-precommit" });
    expect(s[0].rationale).toContain("Lint");
  });

  it("offers guidance instead of one-click when pre-commit isn't installable", () => {
    const s = findSkills(
      base({
        skipRates: [{ type: "Test", skipRate: 70 }],
        signals: { ...FULL_SIGNALS, preCommit: false },
        preCommitInstallable: false,
      })
    );
    expect(s[0].action.kind).toBe("guidance");
  });

  it("suggests adding the means for a check that's skipped and unrunnable", () => {
    const s = findSkills(
      base({
        skipRates: [{ type: "Lint", skipRate: 90 }],
        signals: { ...FULL_SIGNALS, lintScript: false, lintConfig: false, lintDep: false },
      })
    );
    const addMeans = s.find((x) => x.id === "add-means-lint");
    expect(addMeans).toBeTruthy();
    expect(addMeans!.action.kind).toBe("guidance");
  });

  it("does not flag checks below the skip threshold", () => {
    const s = findSkills(
      base({
        skipRates: [{ type: "Lint", skipRate: 20 }],
        signals: { ...FULL_SIGNALS, preCommit: false },
      })
    );
    expect(s.find((x) => x.id === "precommit-net")).toBeUndefined();
  });

  it("needs at least 3 sessions of history before nudging the pre-commit net", () => {
    const s = findSkills(
      base({
        recentCount: 2,
        skipRates: [{ type: "Lint", skipRate: 100 }],
        signals: { ...FULL_SIGNALS, preCommit: false },
      })
    );
    expect(s.find((x) => x.id === "precommit-net")).toBeUndefined();
  });

  it("suggests agent guidance when the guidance file doesn't mention validation", () => {
    const s = findSkills(base({ signals: { ...FULL_SIGNALS, agentMentionsValidation: false } }));
    expect(s.find((x) => x.id === "agent-guidance")).toBeTruthy();
  });

  it("returns nothing to do when everything is in place", () => {
    expect(findSkills(base({ skipRates: [{ type: "Lint", skipRate: 0 }] }))).toEqual([]);
  });
});
