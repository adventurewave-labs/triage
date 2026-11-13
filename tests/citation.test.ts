import { describe, expect, it } from "vitest";
import { CitationGateError, validateCitations } from "../src/engine/score.js";
import type { EvidencePack, DimensionScore } from "../src/engine/types.js";

function fakePack(itemIds: string[]): EvidencePack {
  return {
    subject_id: "test:subject",
    subject_type: "company",
    rubric_version: "v0",
    generated_at: new Date().toISOString(),
    hash: "test-hash",
    items: itemIds.map((id) => ({ id, kind: "signal", text: `text for ${id}`, source: "test" })),
  };
}

function dim(key: string, score: number, evidence: string[]): DimensionScore {
  return { key, score, evidence, counter_evidence: [], rationale: "test" };
}

const COMPANY_DIMS = ["why_now", "market_structure", "wedge_defensibility", "regulatory_posture", "capital_efficiency", "signal_momentum"];

describe("citation gate (FR-8 hard gate)", () => {
  it("rejects evidence refs that do not resolve to pack items", () => {
    const pack = fakePack(["sim:s-1", "sim:s-2"]);
    const dims = COMPANY_DIMS.map((k) => dim(k, 3, ["sim:s-1", "sim:s-2"]));
    dims[0]!.evidence.push("hallucinated-ref");
    expect(() => validateCitations(pack, dims)).toThrow(CitationGateError);
    expect(() => validateCitations(pack, dims)).toThrow(/hallucinated-ref/);
  });

  it("rejects scores above 0 citing fewer than the rubric minimum", () => {
    const pack = fakePack(["sim:s-1", "sim:s-2"]);
    const dims = COMPANY_DIMS.map((k) => dim(k, 3, ["sim:s-1", "sim:s-2"]));
    dims[0] = { ...dims[0]!, score: 3, evidence: ["sim:s-1"] };
    expect(() => validateCitations(pack, dims)).toThrow(CitationGateError);
    expect(() => validateCitations(pack, dims)).toThrow(/rubric minimum/);
  });

  it("accepts score 0 with no evidence (anchor: no credible evidence available)", () => {
    const pack = fakePack(["sim:s-1", "sim:s-2"]);
    const dims = COMPANY_DIMS.map((k) => dim(k, 3, ["sim:s-1", "sim:s-2"]));
    dims[0] = { ...dims[0]!, score: 0, evidence: [] };
    expect(() => validateCitations(pack, dims)).not.toThrow();
  });

  it("rejects drafts missing dimensions entirely", () => {
    const pack = fakePack(["sim:s-1", "sim:s-2"]);
    const dims = COMPANY_DIMS.slice(1).map((k) => dim(k, 3, ["sim:s-1", "sim:s-2"]));
    expect(() => validateCitations(pack, dims)).toThrow(/missing/);
  });
});
