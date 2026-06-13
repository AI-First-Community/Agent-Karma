// The single adapter that compiles a player's Dojo choices into the exact event
// shapes the REAL engine reads (extractKarmaFacts), so the playground scores with
// the genuine `calculateKarmaScore` — no re-implemented scoring.
//
// Pedagogy lives here: a validation the player runs whose type matches a hidden
// issue simulates `result: "failed"` (they caught it) — which still earns the
// "tests run" credit but NOT the "tests passed" bonus. Skipping it leaves the bug
// to "ship", surfaced at debrief.
import { scorePrompt } from "../engine/karma";
import type { AgentKarmaEvent, ValidationCommandType } from "../engine/karma";

export interface DojoIssue {
  /** Which validation TYPE would have caught this issue. */
  kind: ValidationCommandType;
  severity: "low" | "med" | "high";
  title: string;
  explanation: string;
}

export interface DojoScenarioData {
  fileName: string;
  hiddenIssues: DojoIssue[];
}

export interface DojoChoices {
  /** The player's restated intent — scored by the REAL prompt scorer. */
  intent: string;
  /** Validation types the player chose to run. */
  ranValidations: ValidationCommandType[];
  /** Did the player add/update a test alongside the change? */
  addedTest: boolean;
}

export interface BuiltInput {
  events: AgentKarmaEvent[];
  gitCaptured: boolean;
  promptHintScore: number;
}

const TS = "2026-01-01T00:00:00.000Z";

/** A validation "fails" (catches a bug) if any hidden issue is of its type. */
export function validationFails(
  cmd: ValidationCommandType,
  issues: DojoIssue[]
): boolean {
  return issues.some((i) => i.kind === cmd);
}

export function buildEvents(scenario: DojoScenarioData, choices: DojoChoices): BuiltInput {
  const events: AgentKarmaEvent[] = [];
  let id = 0;
  const push = (type: AgentKarmaEvent["type"], data: Record<string, unknown>) =>
    events.push({ id: String(++id), sessionId: "dojo", type, timestamp: TS, data });

  // The AI's change touched a source file…
  const ext = scenario.fileName.split(".").pop() ?? "ts";
  push("file.saved", { fileName: scenario.fileName, extension: ext, isTestFile: false });
  // …and the player may have added a test alongside it.
  if (choices.addedTest) {
    push("file.saved", { fileName: "change.test." + ext, extension: ext, isTestFile: true });
  }

  // Each validation the player chose to run (observed, so passing tests earn the bonus).
  for (const cmd of choices.ranValidations) {
    push("validation.command", {
      commandType: cmd,
      result: validationFails(cmd, scenario.hiddenIssues) ? "failed" : "passed",
      source: "observed",
    });
  }

  return {
    events,
    gitCaptured: true, // a real change was made
    promptHintScore: scorePrompt(choices.intent).score,
  };
}
