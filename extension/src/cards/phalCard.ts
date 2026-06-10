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

  const recommendations: string[] = [];
  if (!validationDetected && !lowRiskInformational) {
    recommendations.push("Run tests or a build to validate these changes.");
  }
  if (dc?.intentType === "Bug Fix" && testFilesChanged === 0) {
    recommendations.push("Consider adding or updating a regression test.");
  }
  if (!commandsDetected.some((c) => c.type === "Lint")) {
    recommendations.push("Run lint before committing.");
  }
  const gitEvent = input.events.find((e) => e.type === "git.diff.summary");
  if (!gitEvent || gitEvent.data.captured !== true) {
    recommendations.push("Review the git diff manually before committing.");
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
