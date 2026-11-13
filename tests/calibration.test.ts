import { describe, expect, it } from "vitest";
import { getTestDb } from "../src/engine/db.js";
import { runCalibration, assertNoContamination } from "../src/engine/calibration.js";
import { MockProvider } from "../src/engine/providers/mock.js";

function spearmanLocal(pairs: Array<{ x: number; y: number }>): number {
  const n = pairs.length;
  const rank = (values: number[]): number[] => {
    const sorted = values.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
    const ranks = new Array<number>(values.length);
    for (let k = 0; k < sorted.length; k++) ranks[sorted[k]!.i] = k + 1;
    return ranks;
  };
  const rx = rank(pairs.map((p) => p.x));
  const ry = rank(pairs.map((p) => p.y));
  const mx = rx.reduce((a, b) => a + b, 0) / n;
  const my = ry.reduce((a, b) => a + b, 0) / n;
  let num = 0, dx = 0, dy = 0;
  for (let k = 0; k < n; k++) {
    num += (rx[k]! - mx) * (ry[k]! - my);
    dx += (rx[k]! - mx) ** 2;
    dy += (ry[k]! - my) ** 2;
  }
  return num / Math.sqrt(dx * dy);
}

describe("calibration eval (PRD §9.1/9.2)", () => {
  it("rank correlation is exact on monotone data and inverted on anti-monotone data", () => {
    // tie-free fixtures: sequential ranks == average ranks, so ±1 is exact
    const mono = [1, 2, 3, 4].map((v, i) => ({ x: v, y: [1, 2, 3, 4][i]! }));
    expect(spearmanLocal(mono)).toBeCloseTo(1, 5);
    const anti = [1, 2, 3, 4].map((v, i) => ({ x: v, y: [4, 3, 2, 1][i]! }));
    expect(spearmanLocal(anti)).toBeCloseTo(-1, 5);
  });

  it("contamination guard fires when golden companies leak into the corpus", async () => {
    const db = await getTestDb();
    await db.query(`INSERT INTO entities (id, type, name, name_normalized, simulated) VALUES ('test:x','company','Pear Therapeutics','pear therapeutics',false)`);
    await expect(assertNoContamination(db)).rejects.toThrow(/eval contamination/);
  });

  it("back-scores the golden set over confirmed entries only, with provider label and honest note", async () => {
    const db = await getTestDb();
    const provider = new MockProvider();
    const report = await runCalibration(db, provider);
    expect(report.provider).toBe("mock-lexicon-v0");
    expect(report.n_confirmed).toBeGreaterThanOrEqual(10);
    expect(report.scored.every((s) => ["up", "down", "flat"].includes(s.outcome))).toBe(true);
    expect(report.honestNote).toMatch(/Directional/i);
    // scores persisted for the reproducibility contract
    const rows = await db.query<{ n: string }>(`SELECT count(*)::text AS n FROM scores`);
    expect(Number(rows.rows[0]!.n)).toBeGreaterThanOrEqual(report.n_confirmed + report.n_candidate);
  });
});
