import { describe, expect, it } from "vitest";
import { getTestDb } from "../src/engine/db.js";
import { resolveEntity, MERGE_THRESHOLD } from "../src/engine/resolve.js";

describe("entity resolution", () => {
  it("reuses an exact normalized match instead of creating a duplicate", async () => {
    const db = await getTestDb();
    const first = await resolveEntity(db, { type: "company", name: "Corvia Care" });
    const second = await resolveEntity(db, { type: "company", name: "Corvia  Care" });
    expect(first.action).toBe("created");
    expect(second.action).toBe("reused");
    expect(second.id).toBe(first.id);
    expect(second.merge_confidence).toBeGreaterThanOrEqual(MERGE_THRESHOLD);
  });

  it("queues near-matches for human review instead of auto-merging", async () => {
    const db = await getTestDb();
    await resolveEntity(db, { type: "company", name: "Hesper Wound" });
    const near = await resolveEntity(db, { type: "company", name: "Hesper" });
    // wrong splits are cheap; wrong merges poison scores — so: no auto-merge
    expect(near.id).not.toBe("sim:hesper");
    const queue = await db.query<{ candidate_name: string }>(
      `SELECT candidate_name FROM review_queue WHERE status='pending'`
    );
    expect(queue.rows.length).toBe(1);
  });

  it("never merges below the confidence threshold", async () => {
    const db = await getTestDb();
    const a = await resolveEntity(db, { type: "company", name: "Lucerna Health" });
    const b = await resolveEntity(db, { type: "company", name: "Lucerna Healthx" });
    expect(a.id).not.toBe(b.id);
  });
});
