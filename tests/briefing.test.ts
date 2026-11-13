import { describe, expect, it } from "vitest";
import { buildBriefing } from "../src/engine/briefing.js";
import type { ScoreResult } from "../src/engine/types.js";

function score(id: string, name: string, total: number, evidenceCount: number): ScoreResult {
  return {
    subject_id: id,
    subject_name: name,
    subject_type: "company",
    rubric_version: "v0",
    provider: "mock-lexicon-v0",
    run_id: "test-run",
    pack_hash: "h",
    total,
    confidence: 0.5,
    dimensions: [],
    bear_case: "fixture bear case",
    why_now: ["fixture why-now"],
    evidence_count: evidenceCount,
    first_seen: "2026-10-01",
    red_team: { challenges: [], summary: "none" },
  };
}

describe("weekly briefing (rank + declined, nothing silently dropped, FR-6)", () => {
  it("ranks by score and caps at 10", async () => {
    const scores = Array.from({ length: 14 }, (_, i) => score(`c${i}`, `Co${i}`, 3 - i * 0.1, 8));
    const briefing = await buildBriefing({ query: async () => ({ rows: [] }) } as never, scores);
    expect(briefing.cards.length).toBe(10);
    expect(briefing.cards[0]!.name).toBe("Co0");
    expect(briefing.declined.length).toBe(4);
    expect(briefing.declined.every((d) => d.reason === "below_rank_line")).toBe(true);
  });

  it("flags thin-evidence companies as insufficient_data instead of hiding them", async () => {
    const scores = [score("a", "ThinCo", 3.5, 2), score("b", "FullCo", 3.0, 9)];
    const briefing = await buildBriefing({ query: async () => ({ rows: [] }) } as never, scores);
    const thin = briefing.declined.find((d) => d.name === "ThinCo");
    expect(thin?.reason).toBe("insufficient_data");
  });
});
