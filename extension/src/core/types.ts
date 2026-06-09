// Shared data model for Agent Karma.
// This is the foundation contract — every module reads/writes these shapes.
// Normative field rules live in docs/scoring-model.md and docs/specification.md.
// PRIVACY: persisted/exported data is metadata only — never source content,
// never terminal output, never raw command strings (see docs/architecture.md §5).

/** The unit of reflection: one AI-assisted piece of work, intent → outcome. */
export interface AgentKarmaSession {
  id: string;
  title: string;
  /** A reflection label only (see specification §3) — NOT a scored input. */
  aiTool: string;
  /** Exact literal from specification §4. */
  taskType: string;
  /** User's typed intent (free text, local only). */
  intent: string;
  /** ISO-8601 — the source of truth for elapsed time (recomputed, never counted). */
  startedAt: string;
  endedAt?: string;
  status: "active" | "completed";
  /** Prompt hygiene hint (0–100), contributes ≤10% of the Karma Score. */
  promptHintScore?: number;
  promptHintLabel?: PromptHintLabel;
  dharmaCard?: DharmaCard;
  phalCard?: PhalCard;
  /** 0–100, OBJECTIVE (validation-weighted, action-based). */
  karmaScore?: number;
  karmaScoreLabel?: KarmaScoreLabel;
  gitDiffSummary?: GitDiffSummary;
  /** OPTIONAL, UNSCORED — journaling only; never used in karmaScore. */
  reflection?: ReflectionNote;
}

export type PromptHintLabel = "Needs Clarity" | "Decent" | "Good" | "Excellent";
export type KarmaScoreLabel = "Needs Attention" | "Improving" | "Good" | "Strong";

/** Contributes 0 to the score — reflection/journaling only. */
export interface ReflectionNote {
  reviewedDiff?: "yes" | "no";
  outcomeMatchedIntent?: "yes" | "partly" | "no";
  note?: string;
}

export type AgentKarmaEventType =
  | "session.started"
  | "intent.captured"
  | "prompt.scored"
  | "dharma.generated"
  | "file.saved"
  | "validation.command" // observed OR logged — data.source distinguishes
  | "git.diff.summary"
  | "karma.score.generated"
  | "phal.generated"
  | "outcome.reported" // optional unscored reflection
  | "session.ended";

export interface AgentKarmaEvent {
  id: string;
  sessionId: string;
  type: AgentKarmaEventType;
  timestamp: string; // ISO-8601
  data: Record<string, unknown>;
}

export interface DharmaCard {
  task: string;
  aiTool: string;
  intentType: string;
  intentClarity: PromptHintLabel;
  contextProvided: "None" | "Partial" | "Good";
  expectedValidation: "Not Mentioned" | "Recommended" | "Explicit";
  riskLevel: "Low" | "Medium" | "High";
}

export interface FileSavedEventData {
  fileName: string;
  extension: string;
  /** Only when agentKarma.storeFullFilePath = true. */
  fullPath?: string;
  isTestFile: boolean;
}

export type ValidationCommandType =
  | "Test"
  | "Build"
  | "Lint"
  | "Type Check"
  | "Security"
  | "Other";

export interface ValidationCommandEventData {
  commandType: ValidationCommandType;
  result: "passed" | "failed" | "unknown";
  /** Only "observed" results grant the tests-passed bonus. */
  source: "observed" | "logged";
  // NOTE: the raw command string is used transiently for classification then
  // DISCARDED — it is never persisted or exported.
}

export interface GitDiffSummary {
  filesChanged: number;
  linesAdded: number;
  linesDeleted: number;
  /** false if git unavailable / not a repo / failed. */
  captured: boolean;
  error?: string;
}

export interface PhalCard {
  outcome: "Ready for Review" | "Needs Review" | "High Risk" | "Informational";
  filesChanged: number;
  testFilesChanged: number;
  validationDetected: boolean;
  /** Command TYPES + results — never raw strings. */
  commandsDetected: { type: ValidationCommandType; result: string }[];
  recommendations: string[];
}

/** Root of the persisted store (sessions.json). */
export interface AgentKarmaStore {
  schemaVersion: number;
  sessions: AgentKarmaSession[];
  /** Exponential moving average of recent Karma Scores (self-comparative trend). */
  karmaEma?: number;
}

export const SCHEMA_VERSION = 1;
