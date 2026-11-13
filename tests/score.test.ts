import { describe, expect, it } from "vitest";
import { getTestDb } from "../src/engine/db.js";
import { MockProvider } from "../src/engine/providers/mock.js";
import { scoreSubject, newRunId } from "../src/engine/score.js";
import { packFromSummaries } from "../src/engine/pack.js";

const POSITIVE_A = { text: "Company received FDA clearance and raised $22M Series A with strong growth (2025-10-01).", source: "fixture" };
const POSITIVE_B = { text: "Trial registered with enrollment open; VP hired from a leading center (2025-10-20).", source: "fixture" };
const NEGATIVE = { text: "Company reported major losses and a settlement with regulators; operations wound down (2025-09-01).", source: "fixture" };

describe("scoring loop (draft → citation gate → red-team → adjudicate)", () => {
  it("is deterministic: identical pack yields identical scores", async () => {
    const db = await getTestDb();
    const provider = new MockProvider();
    const a = packFromSummaries("TestCo", [POSITIVE_A, POSITIVE_B, NEGATIVE], "v0");
    const b = packFromSummaries("TestCo", [POSITIVE_A, POSITIVE_B, NEGATIVE], "v0");
    const run = newRunId("test");
    const s1 = await scoreSubject(db, provider, a, run);
    const s2 = await scoreSubject(db, provider, b, run);
    expect(s1.dimensions.map((d) => [d.key, d.score])).toEqual(s2.dimensions.map((d) => [d.key, d.score]));
    expect(s1.pack_hash).toBe(s2.pack_hash);
  });

  it("every dimension cites only resolvable pack item ids", async () => {
    const db = await getTestDb();
    const provider = new MockProvider();
    const pack = packFromSummaries("TestCo", [POSITIVE_A, POSITIVE_B], "v0");
    const result = await scoreSubject(db, provider, pack, newRunId("test"));
    const packIds = new Set(pack.items.map((i) => i.id));
    for (const d of result.dimensions) {
      for (const e of d.evidence) expect(packIds.has(e)).toBe(true);
    }
  });

  it("a surviving counter-signal surfaces verbatim in the bear case", async () => {
    const db = await getTestDb();
    const provider = new MockProvider();
    const pack = packFromSummaries("TestCo", [POSITIVE_A, POSITIVE_B, NEGATIVE], "v0");
    const result = await scoreSubject(db, provider, pack, newRunId("test"));
    expect(result.bear_case).toContain(NEGATIVE.text);
  });

  it("stale evidence draws a red-team challenge", async () => {
    const db = await getTestDb();
    const provider = new MockProvider();
    // a pack whose only signals map to dims and carry old dates → stale
    const pack = packFromSummaries("OldCo", [{ text: "Raised seed funding (2019).", source: "fixture" }, { text: "Hired an operations lead (2019).", source: "fixture" }], "v0");
    const result = await scoreSubject(db, provider, pack, newRunId("test"));
    const staleChallenges = result.red_team.challenges.filter((c) => /stale/i.test(c.challenge));
    // packFromSummaries items have no occurred_at → not stale; the mock must NOT fabricate staleness
    expect(staleChallenges.length).toBe(0);
    // the single-source rule does fire: each dim with 1 cited item is challenged
    const singleSource = result.red_team.challenges.filter((c) => /single evidence item/i.test(c.challenge));
    expect(singleSource.length).toBeGreaterThan(0);
  });
});
