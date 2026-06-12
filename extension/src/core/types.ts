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
  /** True for auto-managed ambient (continuous, per-day) sessions. */
  ambient?: boolean;
  /** Prompt hygiene hint (0–100), contributes ≤10% of the Karma Score. */
  promptHintScore?: number;
  promptHintLabel?: PromptHintLabel;
  dharmaCard?: DharmaCard;
  phalCard?: PhalCard;
  /** 0–100, OBJECTIVE (validation-weighted, action-based). */
  karmaScore?: number;
  karmaScoreLabel?: KarmaScoreLabel;
  /** Persisted "why this score" breakdown so the dashboard survives a reload. */
  karmaReasons?: string[];
  /** Self-comparative trend vs. the user's own EMA at the time of scoring. */
  karmaTrend?: "up" | "down" | "flat";
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

export type ValidationResult = "passed" | "failed" | "unknown";

export interface ValidationCommandEventData {
  commandType: ValidationCommandType;
  result: ValidationResult;
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
  commandsDetected: { type: ValidationCommandType; result: ValidationResult }[];
  recommendations: string[];
}

/** Root of the persisted session store (sessions.json). */
export interface AgentKarmaStore {
  schemaVersion: number;
  sessions: AgentKarmaSession[];
  /** Exponential moving average of recent Karma Scores (self-comparative trend). */
  karmaEma?: number;
}

/** Root of the persisted event store (events.json). */
export interface AgentKarmaEventStore {
  schemaVersion: number;
  events: AgentKarmaEvent[];
}

/**
 * User settings (mirrors contributes.configuration / settings.json).
 * Single typed source of truth — consumers read this, not stringly-typed keys.
 * Hardcoded-off rules (captureTerminalOutput) are enforced regardless of value.
 */
export interface AgentKarmaSettings {
  enabled: boolean;
  storeFullFilePath: boolean;
  captureTerminalCommands: boolean;
  /** Hardcoded off — never enabled, even if set true. */
  captureTerminalOutput: false;
  capturePromptText: boolean;
  enableGitDiffSummary: boolean;
  enablePreCommitNudge: boolean;
  forgotToStartThreshold: number;
  idleEndMinutes: number;
}

export const DEFAULT_SETTINGS: AgentKarmaSettings = {
  enabled: true,
  storeFullFilePath: false,
  captureTerminalCommands: true,
  captureTerminalOutput: false,
  capturePromptText: true,
  enableGitDiffSummary: true,
  enablePreCommitNudge: false,
  forgotToStartThreshold: 5,
  idleEndMinutes: 30,
};

/** Return shape of the pure prompt hygiene scorer (scoring-model.md §2). */
export interface PromptHintResult {
  score: number; // 0–100
  label: PromptHintLabel;
  reasons: string[];
}

/** Return shape of the pure objective Karma scorer (scoring-model.md §3). */
/** Per-rule outcome for one session — makes every Karma point traceable. */
export interface KarmaRuleResult {
  id: string;
  label: string;
  /** Points earned this session (0 if not earned). */
  points: number;
  /** Nominal weight of the rule (what it's worth when fully earned). */
  maxPoints: number;
  earned: boolean;
  description: string;
}

export interface ScoreResult {
  score: number; // 0–100, Math.round
  label: KarmaScoreLabel;
  reasons: string[];
  /** Full per-rule breakdown (every rule, earned or not). Optional for back-compat. */
  breakdown?: KarmaRuleResult[];
}

/**
 * Karma Score label bands (scoring-model.md §3 is normative).
 * Pinned here so no module re-derives the thresholds.
 */
export const KARMA_SCORE_BANDS: { min: number; label: KarmaScoreLabel }[] = [
  { min: 80, label: "Strong" },
  { min: 60, label: "Good" },
  { min: 40, label: "Improving" },
  { min: 0, label: "Needs Attention" },
];

/** Prompt hygiene hint label bands (scoring-model.md §2). */
export const PROMPT_HINT_BANDS: { min: number; label: PromptHintLabel }[] = [
  { min: 90, label: "Excellent" },
  { min: 70, label: "Good" },
  { min: 40, label: "Decent" },
  { min: 0, label: "Needs Clarity" },
];

/** EMA smoothing factor for the self-comparative Karma trend (scoring-model.md §3.3). */
export const KARMA_EMA_ALPHA = 0.3;

/** globalState key holding the active-session pointer for crash recovery (architecture §6). */
export const ACTIVE_SESSION_POINTER_KEY = "agentKarma.activeSessionId";

/** Supported AI tools (specification §3) — a reflection label, not a scored input. */
export const AI_TOOLS = [
  "GitHub Copilot",
  "Claude Code",
  "Cursor",
  "ChatGPT",
  "Windsurf",
  "Antigravity",
  "Devin",
  "Gemini CLI",
  "Codex CLI",
  "Other",
  "Unknown",
] as const;

/** Task types (specification §4) — exact literals, never abbreviated. */
export const TASK_TYPES = [
  "Bug Fix",
  "Test Generation",
  "Refactoring",
  "Documentation",
  "Explanation",
  "Performance Improvement",
  "Security Fix",
  "Migration",
  "Architecture",
  "DevOps",
  "Other",
] as const;

export const SCHEMA_VERSION = 1;
