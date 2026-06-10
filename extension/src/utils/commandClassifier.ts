import { ValidationCommandType } from "../core/types";

// Classify a validation command by keyword (specification §7). The raw command
// string is used ONLY to derive the type and is then discarded by callers — it is
// never persisted or exported (privacy). Rule order matches the spec table.

const RULES: { type: ValidationCommandType; keywords: string[] }[] = [
  { type: "Test", keywords: ["test", "pytest", "jest", "mocha", "vitest"] },
  { type: "Build", keywords: ["build", "compile", "mvn package", "gradle build"] },
  { type: "Lint", keywords: ["lint", "eslint", "flake8", "ruff"] },
  { type: "Type Check", keywords: ["tsc", "typecheck"] },
  { type: "Security", keywords: ["snyk", "audit", "trivy"] },
];

export function classifyCommand(command: string): ValidationCommandType {
  const c = command.toLowerCase();
  for (const rule of RULES) {
    if (rule.keywords.some((k) => c.includes(k))) {
      return rule.type;
    }
  }
  return "Other";
}
