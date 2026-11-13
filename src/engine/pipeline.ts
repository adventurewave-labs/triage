import type { PGlite } from "@electric-sql/pglite";
import { seedCorpus as seedImpl, countRows as countImpl } from "./corpus.js";

export { seedCorpus, countRows } from "./corpus.js";

/** Resolve a human-typed name to the corpus entity id (deterministic, normalized). */
export async function findEntityNameSeed(db: PGlite, name: string): Promise<string | null> {
  const norm = name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const rows = await db.query<{ id: string }>(
    `SELECT id FROM entities WHERE name_normalized = $1 LIMIT 1`,
    [norm]
  );
  if (rows.rows[0]) return rows.rows[0].id;
  const partial = await db.query<{ id: string }>(
    `SELECT id FROM entities WHERE name_normalized LIKE '%' || $1 || '%' ORDER BY name_normalized LIMIT 1`,
    [norm]
  );
  return partial.rows[0]?.id ?? null;
}

export async function ensureSeeded(db: PGlite): Promise<boolean> {
  const counts = await countImpl();
  if (counts.entities === 0) {
    await seedImpl();
    return true;
  }
  return false;
}
