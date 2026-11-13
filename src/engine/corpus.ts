import { getDb } from "./db.js";
import type { Entity, Edge, SignalRow } from "./types.js";
import { SIM_PREFIX } from "./adapters/index.js";
import corpusFile from "../../seed/corpus.json" with { type: "json" };
import goldenFile from "../../golden-set/golden-set.json" with { type: "json" };

interface CorpusCompany {
  id: string; name: string; domain: string; care_area: string; stage: string; description: string;
}
interface CorpusPerson {
  id: string; name: string; role: string; company: string | null;
}
interface CorpusEdge {
  type: string; from: string; to: string; evidence: string; merge_confidence: number;
}
interface CorpusSignal {
  id: string; type: string; source: string; occurred_at: string; entities: string[]; text: string;
}
interface CorpusFile {
  meta: { watermark: string; now: string; note: string };
  companies: CorpusCompany[];
  people: CorpusPerson[];
  edges: CorpusEdge[];
  signals: CorpusSignal[];
}

/** Eval-contamination control (PRD §10): golden companies never enter the live corpus. */
export function goldenNameSet(): Set<string> {
  const set = new Set<string>();
  for (const entry of goldenFile.entries as Array<{ name: string }>) {
    set.add(entry.name.toLowerCase());
  }
  return set;
}

export function demoNow(): string {
  return (corpusFile as CorpusFile).meta.now;
}

export async function seedCorpus(): Promise<{ entities: number; edges: number; signals: number; skipped: string[] }> {
  const db = await getDb();
  const corpus = corpusFile as CorpusFile;
  const golden = goldenNameSet();
  const skipped: string[] = [];

  for (const c of corpus.companies) {
    if (golden.has(c.name.toLowerCase())) {
      skipped.push(c.name);
      continue;
    }
    await db.query(
      `INSERT INTO entities (id, type, name, name_normalized, data, simulated)
       VALUES ($1, 'company', $2, $3, $4, true)
       ON CONFLICT (id) DO NOTHING`,
      [c.id, c.name, normalize(c.name), JSON.stringify({ domain: c.domain, care_area: c.care_area, stage: c.stage, description: c.description })]
    );
  }
  for (const p of corpus.people) {
    await db.query(
      `INSERT INTO entities (id, type, name, name_normalized, data, simulated)
       VALUES ($1, 'person', $2, $3, $4, true)
       ON CONFLICT (id) DO NOTHING`,
      [p.id, p.name, normalize(p.name), JSON.stringify({ role: p.role, company: p.company })]
    );
    if (p.company) {
      await db.query(
        `INSERT INTO edges (type, from_id, to_id, evidence, merge_confidence, provenance)
         SELECT 'co-founder', $1, $2, 'corpus', 0.98, 'seed-corpus'
         WHERE NOT EXISTS (SELECT 1 FROM edges WHERE type='co-founder' AND from_id=$1 AND to_id=$2)`,
        [p.id, p.company]
      );
    }
  }
  for (const e of corpus.edges) {
    await db.query(
      `INSERT INTO edges (type, from_id, to_id, evidence, merge_confidence, provenance)
       SELECT $1, $2, $3, $4, $5, 'seed-corpus'
       WHERE NOT EXISTS (SELECT 1 FROM edges WHERE type=$1 AND from_id=$2 AND to_id=$3)`,
      [e.type, e.from, e.to, e.evidence, e.merge_confidence]
    );
  }
  for (const s of corpus.signals) {
    await db.query(
      `INSERT INTO signals (id, type, source, source_url, occurred_at, raw_ref, text, simulated)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true)
       ON CONFLICT (id) DO NOTHING`,
      [s.id, s.type, s.source, `${SIM_PREFIX}${s.id}`, s.occurred_at, `${SIM_PREFIX}${s.id}`, s.text]
    );
    for (const ent of s.entities) {
      await db.query(
        `INSERT INTO signal_entities (signal_id, entity_id) VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [s.id, ent]
      );
    }
  }
  const counts = await countRows();
  return { ...counts, skipped };
}

export async function insertSignal(signal: SignalRow, entityIds: string[]): Promise<void> {
  const db = await getDb();
  await db.query(
    `INSERT INTO signals (id, type, source, source_url, occurred_at, raw_ref, text, simulated)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     ON CONFLICT (id) DO NOTHING`,
    [signal.id, signal.type, signal.source, signal.source_url, signal.occurred_at, signal.raw_ref, signal.text, signal.simulated]
  );
  for (const entityId of entityIds) {
    await db.query(
      `INSERT INTO signal_entities (signal_id, entity_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
      [signal.id, entityId]
    );
  }
}

export async function countRows(): Promise<{ entities: number; edges: number; signals: number }> {
  const db = await getDb();
  const e = await db.query<{ n: string }>(`SELECT count(*)::text AS n FROM entities`);
  const ed = await db.query<{ n: string }>(`SELECT count(*)::text AS n FROM edges`);
  const s = await db.query<{ n: string }>(`SELECT count(*)::text AS n FROM signals`);
  return {
    entities: Number(e.rows[0]?.n ?? 0),
    edges: Number(ed.rows[0]?.n ?? 0),
    signals: Number(s.rows[0]?.n ?? 0),
  };
}

export function normalize(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export type { Entity, Edge };
