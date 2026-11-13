import { describe, expect, it } from "vitest";
import { getTestDb } from "../src/engine/db.js";
import { recordOverride, overridesForScore, REASON_CODES } from "../src/engine/overrides.js";

describe("override loop (PRD §9.3 / FR-5)", () => {
  it("accepts the six reason codes and rejects everything else", async () => {
    const db = await getTestDb();
    await db.query(`INSERT INTO scores (id, subject_id, subject_type, rubric_version, provider, run_id, pack_hash, total, confidence, dimensions, bear_case, why_now, evidence_count, first_seen, red_team)
      VALUES (1,'sim:x','company','v0','mock','r','h',1,0.5,'[]','b','[]',1,'2026-01-01','{}')`);
    for (const code of REASON_CODES) {
      const res = await recordOverride(db, { score_id: 1, verdict: "agree", reason_code: code, note: "" });
      expect(res.id).toBeGreaterThan(0);
    }
    await expect(
      recordOverride(db, { score_id: 1, verdict: "agree", reason_code: "because_i_felt_like_it", note: "" })
    ).rejects.toThrow(/invalid reason_code/);
    await expect(
      recordOverride(db, { score_id: 1, verdict: "maybe" as "agree", reason_code: "wrong_weight", note: "" })
    ).rejects.toThrow(/verdict/);
    const list = await overridesForScore(db, 1);
    expect(list.length).toBe(REASON_CODES.length);
  });
});
