import type { EvidencePack } from "../types.js";
import type { DimensionScore, RedTeamReport } from "../types.js";

/**
 * Provider contract. Two implementations ship:
 *  - mock:   transparent, deterministic lexicon-based judge — the whole system
 *            runs offline and CI stays hermetic (no API keys).
 *  - anthropic: frontier judge, enabled with TRIAGE_PROVIDER=anthropic + key.
 * Calibration reports ALWAYS label which provider produced the scores
 * (PRD §9.2 known-confounds note).
 */
export interface JudgeProvider {
  readonly id: string;
  draft(pack: EvidencePack, dimensions: Array<{ key: string; measures: string }>): Promise<DimensionScore[]>;
  redTeam(pack: EvidencePack, dimensions: DimensionScore[]): Promise<RedTeamReport>;
}
