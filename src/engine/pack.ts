import type { PGlite } from "@electric-sql/pglite";
import crypto from "node:crypto";
import type { Entity, EvidencePack, PackItem } from "./types.js";
import { signalsFor } from "./signals.js";
import { neighbors } from "./graph.js";

export async function getEntity(db: PGlite, id: string): Promise<Entity | null> {
  const rows = await db.query<Entity>(`SELECT id, type, name, data FROM entities WHERE id=$1`, [id]);
  return rows.rows[0] ?? null;
}

export async function findEntityByName(db: PGlite, name: string): Promise<Entity | null> {
  const norm = name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const rows = await db.query<Entity>(`SELECT id, type, name, data FROM entities WHERE name_normalized=$1 LIMIT 1`, [norm]);
  return rows.rows[0] ?? null;
}

export function packHash(items: PackItem[]): string {
  const canon = items
    .map((i) => `${i.id}|${i.text}`)
    .sort()
    .join("\n");
  return crypto.createHash("sha256").update(canon).digest("hex").slice(0, 16);
}

/**
 * Evidence pack assembly (PRD §8.1): rubric is NOT in the pack — it is loaded
 * separately and always shipped to the judge first. Pack = entity card + signals
 * (newest first) + graph neighborhood summary. Packs are cached by hash and never
 * silently regenerated (reproducibility contract, PRD §8.3).
 */
export async function assemblePack(db: PGlite, subjectId: string, rubricVersion: string): Promise<EvidencePack> {
  const entity = await getEntity(db, subjectId);
  if (!entity) throw new Error(`unknown subject: ${subjectId}`);

  const items: PackItem[] = [];

  items.push({
    id: "pack:entity-card",
    kind: "entity",
    text: `${entity.name} — ${entity.type}. ${JSON.stringify(entity.data)}`,
    source: "entity registry",
  });

  const signals = await signalsFor(db, subjectId);
  for (const s of signals) {
    items.push({ id: s.id, kind: "signal", text: s.text, source: s.source, occurred_at: s.occurred_at, stale: s.stale });
  }

  const hood = await neighbors(db, subjectId, 2, 12);
  if (hood.length > 0) {
    items.push({
      id: "pack:graph-neighborhood",
      kind: "graph",
      text: `Graph neighborhood (≤2 hops): ${hood.map((n) => `${n.name} [${n.type}]`).join("; ")}`,
      source: "entity graph",
    });
  }

  const hash = packHash(items);
  await db.query(
    `INSERT INTO packs (hash, subject_id, items) VALUES ($1,$2,$3)
     ON CONFLICT (hash) DO NOTHING`,
    [hash, subjectId, JSON.stringify(items)]
  );

  return {
    subject_id: subjectId,
    subject_type: entity.type,
    rubric_version: rubricVersion,
    generated_at: new Date().toISOString(),
    hash,
    items,
  };
}

/** Golden-set back-scoring: build a pack-shaped object from curated evidence summaries. */
export function packFromSummaries(
  subjectName: string,
  summaries: Array<{ text: string; source: string }>,
  rubricVersion: string
): EvidencePack {
  const items: PackItem[] = [
    { id: "pack:entity-card", kind: "entity", text: `${subjectName} — company (back-scored golden entry).`, source: "golden set" },
  ];
  summaries.forEach((s, i) => {
    items.push({ id: `golden:e-${i}`, kind: "signal", text: s.text, source: s.source });
  });
  const hash = packHash(items);
  return {
    subject_id: `golden:${subjectName}`,
    subject_type: "company",
    rubric_version: rubricVersion,
    generated_at: new Date().toISOString(),
    hash,
    items,
  };
}
