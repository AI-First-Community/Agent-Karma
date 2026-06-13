// THE BARREL — the single, only door into the extension's pure engine.
//
// Every site module imports the engine from HERE, never from `@karma/...`
// directly. If a future extension change pulls a node/vscode dependency into a
// "pure" module, it surfaces at this one chokepoint (and the no-node lint guard
// + Vite's hard failure on an unresolvable `vscode` import catch it).
//
// We import the extension's TypeScript SOURCE via the `@karma` alias
// (-> ../extension/src), NOT the compiled `dist/` (which is a CJS bundle with
// `vscode` externalized — wrong shape for the browser).

export { calculateKarmaScore, nextEma, computeTrend } from "@karma/scoring/karmaScore";
export type { KarmaInput } from "@karma/scoring/karmaScore";
export { KARMA_RULES, extractKarmaFacts } from "@karma/scoring/karmaRules";
export { scorePrompt } from "@karma/scoring/promptScorer";

// The shareable Karma Card — the SAME renderer the extension uses, so the web
// card is byte-identical to the one generated in VS Code.
export { renderKarmaCardSvg, renderKarmaCardPrintHtml } from "@karma/cards/karmaCard";
export type { KarmaCardInput } from "@karma/cards/karmaCard";
export type { KarmicMood } from "@karma/dashboard/karmicMessage";

export type {
  AgentKarmaEvent,
  AgentKarmaEventType,
  ValidationCommandType,
  ValidationResult,
  ScoreResult,
  KarmaRuleResult,
  KarmaScoreLabel,
} from "@karma/core/types";
