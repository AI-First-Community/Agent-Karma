import { DharmaCard, PromptHintResult } from "../core/types";

// Dharma Card generation (scoring-model.md §5 is normative). Pure function over the
// session's intent + task type + the prompt hint. Uses the EXACT task-type literals.

/** Context words for the Dharma "contextProvided" check (scoring §5 — a subset). */
const CONTEXT_WORDS = ["file", "error", "module", "function", "api", "class", "service"];
const VALIDATION_WORDS = ["test", "build", "lint", "verify", "validate", "coverage", "regression"];

const RECOMMENDED_TASKS = [
  "Bug Fix", "Security Fix", "Refactoring", "Migration", "DevOps", "Performance Improvement",
];
const HIGH_RISK_TASKS = ["Security Fix", "Migration", "DevOps"];
const MEDIUM_RISK_TASKS = ["Bug Fix", "Refactoring", "Performance Improvement"];

export interface DharmaInput {
  title: string;
  aiTool: string;
  taskType: string;
  intent: string;
}

export function generateDharmaCard(
  input: DharmaInput,
  promptHint: PromptHintResult
): DharmaCard {
  const text = input.intent.toLowerCase();
  const length = input.intent.trim().length;
  const hasContext = CONTEXT_WORDS.some((w) => text.includes(w));

  const contextProvided: DharmaCard["contextProvided"] =
    hasContext && length > 80 ? "Good" : hasContext ? "Partial" : "None";

  const expectedValidation: DharmaCard["expectedValidation"] = VALIDATION_WORDS.some(
    (w) => text.includes(w)
  )
    ? "Explicit"
    : RECOMMENDED_TASKS.includes(input.taskType)
      ? "Recommended"
      : "Not Mentioned";

  const riskLevel: DharmaCard["riskLevel"] = HIGH_RISK_TASKS.includes(input.taskType)
    ? "High"
    : MEDIUM_RISK_TASKS.includes(input.taskType)
      ? "Medium"
      : "Low";

  return {
    task: input.title,
    aiTool: input.aiTool,
    intentType: input.taskType,
    intentClarity: promptHint.label,
    contextProvided,
    expectedValidation,
    riskLevel,
  };
}
