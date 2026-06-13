// Builds the shareable Karma Card from local Dojo progress, using the REAL
// extension renderer + the embedded Manrope font — so the web card is identical
// to the one VS Code generates.
import { renderKarmaCardSvg } from "../engine/karma";
import type { KarmaCardInput } from "../engine/karma";
import { manropeDataUri } from "../engine/manropeFont";
import { stats } from "./progress";

export function buildKarmaCardSvg(name: string): string {
  const s = stats();
  const input: KarmaCardInput = {
    mood: s.mood,
    name: name.trim() || "Validator",
    karma: s.avgKarma,
    validationRate: s.cleanRate,
    bestStreak: s.cleanCount,
    sessions: s.completedCount,
    dateLabel: new Date().toISOString().slice(0, 10),
    fontDataUri: manropeDataUri,
  };
  return renderKarmaCardSvg(input);
}
