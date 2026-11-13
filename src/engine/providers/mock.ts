import type { JudgeProvider } from "./types.js";
import type { DimensionScore, EvidencePack, PackItem, RedTeamChallenge, RedTeamReport } from "../types.js";

/**
 * Deterministic lexicon-based judge. Transparent by design: every score is
 * explainable from the lexicon hits and evidence counts. It is a stand-in for
 * the frontier provider — calibration reports label it, and its known bias
 * (reads outcome-correlated language) is documented in the golden-set
 * methodology (PRD §9.2 confounds).
 */

const POSITIVE = [
  "clearance", "cleared", "breakthrough", "designation", "ipo", "acquired", "acquisition", "premium",
  "raised", "series b", "series a", "profitab", "endpoint met", "growth", "milestone", "registered",
  "enrollment open", "expanded", "first full-year", "up round", "$", "validation", "guideline",
];

const NEGATIVE = [
  "shutdown", "shut down", "bankruptcy", "chapter 7", "chapter 11", "layoff", "settlement",
  "impairment", "wound down", "decline", "claw back", "collapse", "distressed", "losses",
  "delisting", "reverse split", "stale", "passed for stage", "no ", "did not", "slowed",
];

const DIMENSION_HINTS: Record<string, string[]> = {
  why_now: ["2024", "2025", "2026", "clearance", "raised", "registered", "hired", "breakthrough"],
  market_structure: ["payer", "employer", "reimbursement", "market", "channel", "category", "incumbent"],
  wedge_defensibility: ["proprietary", "panel", "algorithm", "network", "registry", "certification", "clearance", "patent"],
  regulatory_posture: ["clearance", "cleared", "fda", "breakthrough", "designation", "regulatory", "reimbursement", "certification"],
  capital_efficiency: ["raised", "series", "$", "burn", "profitab", "cash", "runway"],
  signal_momentum: ["hired", "trial", "registered", "enrollment", "posting", "expanded", "readout"],
  domain_depth: ["years", "published", "author", "cmo", "chief medical", "academic", "center", "clinic"],
  outcome_quality: ["acquired", "ipo", "growth", "prior company", "exit", "profitab"],
  insight_specificity: ["claims", "thesis", "pricing", "mechanism", "non-consensus", "falsifiable", "study"],
  cofounder_complementarity: ["clinical", "engineering", "gtm", "co-founder", "team"],
  recruiting_magnetism: ["hired", "vp", "chief", "talent", "operator"],
  signal_integrity: ["conflict", "discrepancy", "inconsistent", "flag", "unresolved"],
};

function hits(text: string, lexicon: string[]): string[] {
  const hay = text.toLowerCase();
  return lexicon.filter((term) => hay.includes(term));
}

function evidenceForDim(pack: EvidencePack, dimKey: string): PackItem[] {
  const hints = DIMENSION_HINTS[dimKey] ?? [];
  return pack.items.filter(
    (item) => item.kind === "signal" && (hits(item.text, hints).length > 0 || hints.length === 0)
  );
}

export class MockProvider implements JudgeProvider {
  readonly id = "mock-lexicon-v0";

  async draft(pack: EvidencePack, dimensions: Array<{ key: string; measures: string }>): Promise<DimensionScore[]> {
    const out: DimensionScore[] = [];
    for (const dim of dimensions) {
      const candidates = evidenceForDim(pack, dim.key);
      const usable = candidates.slice(0, 6);
      let score = 0;
      let pos = 0;
      let neg = 0;
      for (const item of usable) {
        const p = hits(item.text, POSITIVE).length;
        const n = hits(item.text, NEGATIVE).length;
        const stalenessPenalty = item.stale ? 0.5 : 1;
        if (p > n) {
          pos += stalenessPenalty;
        } else if (n > p) {
          neg += stalenessPenalty;
        }
      }
      // gate-clean by construction: a nonzero score requires the rubric
      // minimum of evidence items; single-source evidence floors to 0
      // with an honest rationale (the citation gate would reject it anyway)
      const minEvidence = 2;
      if (usable.length >= minEvidence && pos + neg > 0) {
        const balance = (pos - neg) / (pos + neg); // -1..1
        score = Math.max(1, Math.min(4, Math.round(2 + balance * 2)));
      } else {
        score = 0;
      }
      const evidence = usable.map((u) => u.id);
      const counter = usable.filter((u) => hits(u.text, NEGATIVE).length > hits(u.text, POSITIVE).length).map((u) => u.id);
      out.push({
        key: dim.key,
        score,
        evidence,
        counter_evidence: counter,
        rationale:
          evidence.length < minEvidence
            ? `${evidence.length} evidence item(s) map to '${dim.key}' — below rubric minimum (${minEvidence}) for a nonzero score.`
            : `${pos} positive / ${neg} negative lexicon hits across ${evidence.length} evidence item(s).`,
      });
    }
    return out;
  }

  async redTeam(pack: EvidencePack, dimensions: DimensionScore[]): Promise<RedTeamReport> {
    const challenges: RedTeamChallenge[] = [];

    // Challenge 1: single-source claims (rubric hard rule)
    for (const dim of dimensions) {
      if (dim.evidence.length === 1) {
        challenges.push({
          dimension: dim.key,
          challenge: `Dimension '${dim.key}' cites a single evidence item — below rubric minimum.`,
          evidence: dim.evidence,
          sustained: true,
        });
      }
    }

    // Challenge 2: stale evidence usage
    const stale = pack.items.filter((i) => i.stale === true);
    if (stale.length > 0) {
      const usingStale = dimensions.filter((d) => d.evidence.some((e) => stale.some((s) => s.id === e)));
      for (const dim of usingStale) {
        challenges.push({
          dimension: dim.key,
          challenge: `Dimension '${dim.key}' cites stale evidence (past freshness window).`,
          evidence: dim.evidence.filter((e) => stale.some((s) => s.id === e)),
          sustained: true,
        });
      }
    }

    // Challenge 3: strongest surviving counter-signal
    const negatives = pack.items.filter(
      (i) => i.kind === "signal" && hits(i.text, NEGATIVE).length > hits(i.text, POSITIVE).length
    );
    if (negatives.length > 0 && negatives[0]) {
      challenges.push({
        dimension: "*",
        challenge: `Counter-signal survives adjudication: ${negatives[0].text}`,
        evidence: [negatives[0].id],
        sustained: true,
      });
    }

    const summary =
      challenges.length === 0
        ? "Red-team pass found no surviving counterargument at the evidence bar."
        : `${challenges.length} challenge(s) sustained across ${new Set(challenges.map((c) => c.dimension)).size} dimension slot(s).`;

    return { challenges, summary };
  }
}
