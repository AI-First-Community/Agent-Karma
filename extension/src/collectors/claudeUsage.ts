// Local, metadata-only reader for Claude Code's on-disk session logs.
//
// Claude Code writes each turn to ~/.claude/projects/<encoded-cwd>/*.jsonl — entirely
// LOCAL (no network, no API key). We read it to surface what your AI work cost you,
// but we honour the privacy promise: this aggregator only ever touches `usage`,
// `model`, `type` and `timestamp`, and returns NUMBERS. It never reads, returns, or
// stores a single line of your prompts, the AI's replies, or your code.

export interface ModelUsage {
  model: string;
  turns: number;
  outputTokens: number;
}

export interface ClaudeUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  /** Assistant turns (AI responses). */
  turns: number;
  /** Distinct Claude Code sessions seen. */
  sessions: number;
  models: ModelUsage[];
  firstTs?: string;
  lastTs?: string;
}

interface RawLine {
  type?: string;
  timestamp?: string;
  sessionId?: string;
  message?: {
    model?: string;
    usage?: {
      input_tokens?: number;
      output_tokens?: number;
      cache_read_input_tokens?: number;
      cache_creation_input_tokens?: number;
    };
  };
}

const num = (v: unknown): number => (typeof v === "number" && isFinite(v) ? v : 0);

/**
 * Aggregate raw JSONL lines into usage totals. Pure: takes the lines, returns numbers.
 * Malformed lines are skipped. No content is ever extracted.
 */
export function aggregateClaudeUsage(lines: Iterable<string>): ClaudeUsage {
  const acc: ClaudeUsage = {
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheCreationTokens: 0,
    turns: 0,
    sessions: 0,
    models: [],
  };
  const sessionIds = new Set<string>();
  const byModel = new Map<string, ModelUsage>();

  for (const line of lines) {
    if (!line) {
      continue;
    }
    let row: RawLine;
    try {
      row = JSON.parse(line) as RawLine;
    } catch {
      continue;
    }
    if (row.sessionId) {
      sessionIds.add(row.sessionId);
    }
    const u = row.message?.usage;
    if (row.type !== "assistant" || !u) {
      continue;
    }
    const out = num(u.output_tokens);
    acc.inputTokens += num(u.input_tokens);
    acc.outputTokens += out;
    acc.cacheReadTokens += num(u.cache_read_input_tokens);
    acc.cacheCreationTokens += num(u.cache_creation_input_tokens);
    acc.turns += 1;

    const model = row.message?.model ?? "unknown";
    const m = byModel.get(model) ?? { model, turns: 0, outputTokens: 0 };
    m.turns += 1;
    m.outputTokens += out;
    byModel.set(model, m);

    if (row.timestamp) {
      if (!acc.firstTs || row.timestamp < acc.firstTs) {
        acc.firstTs = row.timestamp;
      }
      if (!acc.lastTs || row.timestamp > acc.lastTs) {
        acc.lastTs = row.timestamp;
      }
    }
  }

  acc.sessions = sessionIds.size;
  acc.models = [...byModel.values()].sort((a, b) => b.outputTokens - a.outputTokens);
  return acc;
}

/** Total tokens (all categories) — the headline "what it cost" number. */
export function totalTokens(u: ClaudeUsage): number {
  return u.inputTokens + u.outputTokens + u.cacheReadTokens + u.cacheCreationTokens;
}
