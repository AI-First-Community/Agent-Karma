import { PromptHintResult, PromptHintLabel, PROMPT_HINT_BANDS } from "../core/types";

// Prompt hygiene hint (scoring-model.md §2). A deliberately soft keyword signal —
// NOT a measure of true clarity. Worth at most 10% of the Karma Score and shown
// as a gentle hint, never a headline. Keyword lists are taken verbatim from §2.

const ACTION_WORDS = [
  "fix", "create", "generate", "refactor", "explain",
  "test", "improve", "migrate", "document", "optimize",
];
const CONTEXT_WORDS = [
  "file", "error", "bug", "stack trace", "requirement",
  "api", "function", "class", "module", "service",
];
const CONSTRAINT_WORDS = [
  "only", "avoid", "preserve", "do not", "must", "should", "without", "ensure",
];
const VALIDATION_WORDS = [
  "test", "build", "lint", "verify", "validate", "coverage", "regression",
];

function containsAny(haystack: string, words: string[]): boolean {
  return words.some((w) => haystack.includes(w));
}

function labelFor(score: number): PromptHintLabel {
  // Bands are sorted descending by `min`; the 0-floor always matches.
  return PROMPT_HINT_BANDS.find((b) => score >= b.min)!.label;
}

export function scorePrompt(prompt: string): PromptHintResult {
  const text = prompt.toLowerCase();
  const trimmed = prompt.trim();
  const wordCount = trimmed.length === 0 ? 0 : trimmed.split(/\s+/).length;

  let score = 0;
  const reasons: string[] = [];

  if (wordCount > 5) {
    score += 20;
    reasons.push("More than 5 words (+20)");
  }
  if (containsAny(text, ACTION_WORDS)) {
    score += 20;
    reasons.push("States an action (+20)");
  }
  if (containsAny(text, CONTEXT_WORDS)) {
    score += 15;
    reasons.push("Provides context (+15)");
  }
  if (containsAny(text, CONSTRAINT_WORDS)) {
    score += 15;
    reasons.push("Sets a constraint (+15)");
  }
  if (containsAny(text, VALIDATION_WORDS)) {
    score += 20;
    reasons.push("Mentions validation (+20)");
  }
  if (trimmed.length >= 50 && trimmed.length <= 1000) {
    score += 10;
    reasons.push("Reasonable length (+10)");
  }

  score = Math.min(100, score);
  return { score, label: labelFor(score), reasons };
}
