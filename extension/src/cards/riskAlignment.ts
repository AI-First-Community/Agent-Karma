import { AgentKarmaSession } from "../core/types";

// Effort-vs-risk cross-check (vision.md "Outcome" layer). Brings the Dharma task
// RISK into the per-session view: a high-risk task shipped without validation
// should stand out more than a low-risk one. Pure and testable. Coaching, not
// shaming — a low-risk unvalidated change draws no warning.

export interface RiskAlignment {
  warn: boolean;
  /** Empty when there's nothing worth saying. */
  label: string;
}

export function riskAlignment(session: AgentKarmaSession): RiskAlignment {
  const risk = session.dharmaCard?.riskLevel;
  const validated = session.phalCard?.validationDetected ?? false;
  const filesChanged = session.phalCard?.filesChanged ?? 0;

  if (filesChanged === 0) {
    return { warn: false, label: "" };
  }
  if (validated) {
    return risk === "High"
      ? { warn: false, label: "Validated — a good call on a high-risk change" }
      : { warn: false, label: "" };
  }
  // Unvalidated changes — warn in proportion to the task's risk.
  if (risk === "High") {
    return { warn: true, label: "High-risk change shipped without validation" };
  }
  if (risk === "Medium") {
    return { warn: true, label: "Consider validating this change before you trust it" };
  }
  return { warn: false, label: "" }; // Low-risk unvalidated → fine, no nag
}
