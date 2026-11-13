import rubricJson from "../../rubric/v0.json" with { type: "json" };

export interface Dimension {
  key: string;
  weight: number;
  minEvidence: number;
  measures: string;
}

export interface Rubric {
  version: string;
  scales: { anchor0: string; anchor1: string; anchor2: string; anchor3: string; anchor4: string };
  rules: {
    minEvidencePerDimension: number;
    counterEvidenceRequired: boolean;
    confidenceInputs: string[];
    evidenceStalenessWindows: Record<string, number>;
  };
  company: { dimensions: Dimension[] };
  founder: { dimensions: Dimension[] };
}

export const rubric: Rubric = rubricJson as unknown as Rubric;

export const RUBRIC_VERSION = rubric.version;

export function dimensionsFor(subjectType: string): Dimension[] {
  return subjectType === "person" ? rubric.founder.dimensions : rubric.company.dimensions;
}

export function anchorsText(): string {
  return [rubric.scales.anchor0, rubric.scales.anchor1, rubric.scales.anchor2, rubric.scales.anchor3, rubric.scales.anchor4]
    .map((a, i) => `${i}: ${a}`)
    .join("\n");
}

/** Weighted total on the 0–4 scale. */
export function weightedTotal(dimensionScores: Array<{ key: string; score: number }>): number {
  const dims = dimensionsFor("company").concat(rubric.founder.dimensions);
  let sum = 0;
  let weight = 0;
  for (const d of dims) {
    const match = dimensionScores.find((s) => s.key === d.key);
    if (match) {
      sum += match.score * d.weight;
      weight += d.weight;
    }
  }
  return weight === 0 ? 0 : sum / weight;
}

/**
 * Confidence is derived, not vibes (PRD §6): evidence volume × recency ×
 * cross-dimension consistency. All inputs are mechanical.
 */
export function deriveConfidence(dimensions: Array<{ evidence: string[]; score: number }>): number {
  const totalEvidence = dimensions.reduce((acc, d) => acc + d.evidence.length, 0);
  const volume = Math.min(1, totalEvidence / 12);
  const spread = dimensions.length > 0
    ? dimensions.reduce((acc, d) => acc + d.score, 0) / dimensions.length / 4
    : 0;
  return Number((0.5 * volume + 0.5 * spread).toFixed(2));
}
