import { describe, expect, it } from "vitest";
import { getTestDb } from "../src/engine/db.js";
import { warmPath, neighbors, networkRoots } from "../src/engine/graph.js";

async function seedGraph(db: import("@electric-sql/pglite").PGlite): Promise<void> {
  const ids = ["root:partner", "sim:p-alvarez", "sim:corvia", "sim:quill", "other:orphan"];
  for (const id of ids) {
    await db.query(`INSERT INTO entities (id, type, name, name_normalized) VALUES ($1,'company',$2,$2)`, [id, id]);
  }
  const edges: Array<[string, string, string]> = [
    ["root:partner", "sim:p-alvarez", "sim:knows"],
    ["sim:p-alvarez", "sim:corvia", "co-founder"],
    ["sim:corvia", "sim:quill", "prior_employer"],
  ];
  for (const [from, to, type] of edges) {
    await db.query(
      `INSERT INTO edges (type, from_id, to_id, evidence, merge_confidence, provenance) VALUES ($1,$2,$3,'test',0.99,'test')`,
      [type, from, to]
    );
  }
}

describe("relationship graph", () => {
  it("finds the shortest warm path from network roots to a target", async () => {
    const db = await getTestDb();
    await seedGraph(db);
    const roots = await networkRoots(db);
    expect(roots).toContain("root:partner");
    const path = await warmPath(db, roots, "sim:quill", 3);
    expect(path).not.toBeNull();
    expect(path!.names[0]).toBe("root:partner");
    expect(path!.names[path!.names.length - 1]).toBe("sim:quill");
    expect(path!.path.length).toBe(4); // partner → alvarez → corvia → quill
  });

  it("returns null when no path exists within depth", async () => {
    const db = await getTestDb();
    await seedGraph(db);
    const path = await warmPath(db, ["other:orphan"], "sim:quill", 3);
    expect(path).toBeNull();
  });

  it("caps neighborhood breadth", async () => {
    const db = await getTestDb();
    await seedGraph(db);
    const hood = await neighbors(db, "sim:corvia", 1, 2);
    expect(hood.length).toBeLessThanOrEqual(2);
  });
});
