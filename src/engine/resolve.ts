import type { PGlite } from "@electric-sql/pglite";
import { normalize } from "./corpus.js";
import { isSyntheticId } from "./adapters/index.js";

/**
 * Entity resolution — deterministic first (name + registry-style normalization),
 * embedding-assisted candidates are a later milestone. Design rationale (PRD §7.2/§18):
 * wrong merges poison scores silently; wrong splits are cheap and visible. So:
 * exact-normalized match → reuse (high confidence). No match → create.
 * Nothing auto-merges below threshold; anything ambiguous goes to the review queue.
 */
export const MERGE_THRESHOLD = 0.9;

export interface ResolveResult {
  id: string;
  action: "reused" | "created" | "queued";
  merge_confidence: number;
}

export async function resolveEntity(
  db: PGlite,
  input: { type: "company" | "person" | "investor" | "care_area"; name: string; data?: Record<string, unknown> }
): Promise<ResolveResult> {
  const norm = normalize(input.name);

  const existing = await db.query<{ id: string }>(
    `SELECT id FROM entities WHERE type=$1 AND name_normalized=$2 LIMIT 1`,
    [input.type, norm]
  );
  if (existing.rows.length > 0 && existing.rows[0]) {
    return { id: existing.rows[0].id, action: "reused", merge_confidence: 0.99 };
  }

  // near-match candidates (prefix/substring both ways) — never auto-merge
  const near = await db.query<{ id: string; name: string }>(
    `SELECT id, name FROM entities
     WHERE type=$1 AND (name_normalized LIKE $2 || '%' OR $2 LIKE name_normalized || '%')
     LIMIT 5`,
    [input.type, norm]
  );
  if (near.rows.length > 0) {
    const best = near.rows[0]!;
    await db.query(
      `INSERT INTO review_queue (candidate_name, matched_entity, merge_confidence) VALUES ($1,$2,$3)`,
      [input.name, best.id, 0.55]
    );
    // do not merge — create under a queued-safe id instead
  }

  const prefix = input.type === "company" ? "ent:c" : input.type === "person" ? "ent:p" : "ent:x";
  const id = `${prefix}:${norm.replace(/\s+/g, "-")}-${Date.now().toString(36)}`;
  await db.query(
    `INSERT INTO entities (id, type, name, name_normalized, data, simulated) VALUES ($1,$2,$3,$4,$5,$6)`,
    [id, input.type, input.name, norm, JSON.stringify(input.data ?? {}), false]
  );
  return { id, action: near.rows.length > 0 ? "queued" : "created", merge_confidence: near.rows.length > 0 ? 0.55 : 1.0 };
}

export async function pendingReviewCount(db: PGlite): Promise<number> {
  const res = await db.query<{ n: string }>(`SELECT count(*)::text AS n FROM review_queue WHERE status='pending'`);
  return Number(res.rows[0]?.n ?? 0);
}

export { isSyntheticId };
