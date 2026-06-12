import {
  PhalCard,
  DharmaCard,
  AgentKarmaEvent,
  ValidationCommandType,
  ValidationResult,
} from "../core/types";

// Phal Card generation (scoring-model.md §4 is normative). Pure, task-aware.
// `karmaScore` is optional: omitted in 0.4 (provisional outcome), supplied in 0.5
// to finalize the score-gated outcome.

const VALIDATION_TYPES: ValidationCommandType[] = [
  "Test",
  "Build",
  "Lint",
  "Type Check",
  "Security",
];

export interface PhalInput {
  dharmaCard?: DharmaCard;
  events: AgentKarmaEvent[];
  karmaScore?: number;
}

export function generatePhalCard(input: PhalInput): PhalCard {
  const files = input.events.filter((e) => e.type === "file.saved");
  const filesChanged = files.length;
  const testFilesChanged = files.filter((e) => e.data.isTestFile === true).length;

  const commandsDetected = input.events
    .filter((e) => e.type === "validation.command")
    .map((e) => ({
      type: e.data.commandType as ValidationCommandType,
      result: e.data.result as ValidationResult,
    }));
  const validationDetected = commandsDetected.some((c) => VALIDATION_TYPES.includes(c.type));

  const dc = input.dharmaCard;
  const lowRiskInformational =
    !validationDetected &&
    dc?.expectedValidation === "Not Mentioned" &&
    dc?.riskLevel === "Low";

  const outcome = computeOutcome(
    filesChanged,
    validationDetected,
    lowRiskInformational,
    input.karmaScore
  );

  // Actionable recommendations: each pairs the gap with a concrete next step.
  const recommendations: string[] = [];
  if (!validationDetected && !lowRiskInformational) {
    const what = dc?.riskLevel === "High" ? "this high-risk change" : "these changes";
    recommendations.push(
      `No validation ran — run your test or build command (e.g. \`npm test\` / \`pytest\`) before trusting ${what}.`
    );
  }
  if (dc?.intentType === "Bug Fix" && testFilesChanged === 0) {
    recommendations.push(
      "This bug fix changed code but added no test — a regression test would catch it next time (and raise your Karma)."
    );
  }
  if (!commandsDetected.some((c) => c.type === "Lint")) {
    recommendations.push("No lint ran — run your linter (e.g. `npm run lint`) before committing.");
  }
  const gitEvent = input.events.find((e) => e.type === "git.diff.summary");
  if (!gitEvent || gitEvent.data.captured !== true) {
    recommendations.push("The git diff wasn't captured — review your changes manually before committing.");
  }

  return {
    outcome,
    filesChanged,
    testFilesChanged,
    validationDetected,
    commandsDetected,
    recommendations,
  };
}

function computeOutcome(
  filesChanged: number,
  validationDetected: boolean,
  lowRiskInformational: boolean,
  karmaScore: number | undefined
): PhalCard["outcome"] {
  if (filesChanged === 0 || lowRiskInformational) {
    return "Informational";
  }
  if (karmaScore !== undefined) {
    if (validationDetected && karmaScore >= 75) {
      return "Ready for Review";
    }
    if (karmaScore >= 50) {
      return "Needs Review";
    }
    if (!validationDetected) {
      return "High Risk";
    }
    return "Needs Review";
  }
  // Provisional (no score yet): cannot reach "Ready for Review".
  return validationDetected ? "Needs Review" : "High Risk";
}
