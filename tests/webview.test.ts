import { describe, expect, it } from "vitest";
import { getTestDb } from "../src/engine/db.js";
import { runBriefingPipeline, briefingFromDb, renderBriefing } from "../src/engine/briefing.js";
import { MockProvider } from "../src/engine/providers/mock.js";
import { seedCorpus } from "../src/engine/corpus.js";

describe("briefing pipeline + DB-backed view (web GET path)", () => {
  it("runs the shared pipeline and reconstructs the same briefing from the store", async () => {
    const db = await getTestDb();
    await seedCorpus(db);
    const provider = new MockProvider();
    const briefing = await runBriefingPipeline(db, provider);

    expect(briefing.cards.length).toBeGreaterThan(0);
    expect(briefing.cards[0]!.score_id).not.toBeNull();
    expect(briefing.declined.every((d) => ["insufficient_data", "below_rank_line"].includes(d.reason))).toBe(true);

    const view = await briefingFromDb(db);
    expect(view).not.toBeNull();
    expect(view!.cards.map((c) => c.name)).toEqual(briefing.cards.map((c) => c.name));
    expect(view!.cards[0]!.score).toBe(briefing.cards[0]!.score);
    expect(view!.cards[0]!.score_id).not.toBeNull();

    const rendered = renderBriefing(view!);
    expect(rendered).toContain("Weekly Briefing");
    expect(rendered).toContain("Declined");
  });

  it("returns null when no briefing run exists (web shows CTA)", async () => {
    const db = await getTestDb();
    expect(await briefingFromDb(db)).toBeNull();
  });
});
