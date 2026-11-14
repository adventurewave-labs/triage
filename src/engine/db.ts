import { PGlite } from "@electric-sql/pglite";
import path from "node:path";
import fs from "node:fs";

/**
 * Storage: PGlite (Postgres-in-process). Kept deliberately small — the engine
 * is UI-agnostic so the web app, CLI, and MCP server all read the same store.
 * Data dir is gitignored (.triage/).
 */
let instance: PGlite | null = null;

/** Survives dev-server module reloads (Next/HMR-friendly singleton pattern). */
const globalForDb = globalThis as unknown as { __triagePglite?: PGlite };

export function dataDir(): string {
  return process.env.TRIAGE_DATA_DIR ?? path.join(process.cwd(), ".triage");
}

export async function getDb(): Promise<PGlite> {
  if (instance) return instance;
  if (globalForDb.__triagePglite) return (instance = globalForDb.__triagePglite);
  const dir = dataDir();
  fs.mkdirSync(dir, { recursive: true });
  instance = new PGlite(dir);
  await migrate(instance);
  globalForDb.__triagePglite = instance;
  return instance;
}

/** For tests: an isolated in-memory database. */
export async function getTestDb(): Promise<PGlite> {
  const db = new PGlite();
  await migrate(db);
  return db;
}

async function migrate(db: PGlite): Promise<void> {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS entities (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      name TEXT NOT NULL,
      name_normalized TEXT NOT NULL,
      data JSONB NOT NULL DEFAULT '{}',
      simulated BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS edges (
      id SERIAL PRIMARY KEY,
      type TEXT NOT NULL,
      from_id TEXT NOT NULL REFERENCES entities(id),
      to_id TEXT NOT NULL REFERENCES entities(id),
      evidence TEXT NOT NULL,
      merge_confidence REAL NOT NULL,
      provenance TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS signals (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      source TEXT NOT NULL,
      source_url TEXT NOT NULL,
      occurred_at DATE NOT NULL,
      fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      raw_ref TEXT NOT NULL,
      text TEXT NOT NULL,
      simulated BOOLEAN NOT NULL DEFAULT true
    );
    CREATE TABLE IF NOT EXISTS signal_entities (
      signal_id TEXT NOT NULL REFERENCES signals(id),
      entity_id TEXT NOT NULL REFERENCES entities(id),
      PRIMARY KEY (signal_id, entity_id)
    );
    CREATE TABLE IF NOT EXISTS review_queue (
      id SERIAL PRIMARY KEY,
      candidate_name TEXT NOT NULL,
      matched_entity TEXT,
      merge_confidence REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS packs (
      hash TEXT PRIMARY KEY,
      subject_id TEXT NOT NULL,
      items JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS scores (
      id SERIAL PRIMARY KEY,
      subject_id TEXT NOT NULL,
      subject_type TEXT NOT NULL,
      rubric_version TEXT NOT NULL,
      provider TEXT NOT NULL,
      run_id TEXT NOT NULL,
      pack_hash TEXT NOT NULL,
      total REAL NOT NULL,
      confidence REAL NOT NULL,
      dimensions JSONB NOT NULL,
      bear_case TEXT NOT NULL,
      why_now JSONB NOT NULL,
      evidence_count INTEGER NOT NULL,
      first_seen DATE NOT NULL,
      red_team JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS overrides (
      id SERIAL PRIMARY KEY,
      score_id INTEGER NOT NULL REFERENCES scores(id),
      verdict TEXT NOT NULL,
      reason_code TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      evidence_refs JSONB NOT NULL DEFAULT '[]',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS runs (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      config JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_signals_entities ON signal_entities(entity_id);
    CREATE INDEX IF NOT EXISTS idx_edges_from ON edges(from_id);
    CREATE INDEX IF NOT EXISTS idx_edges_to ON edges(to_id);
    CREATE INDEX IF NOT EXISTS idx_scores_subject ON scores(subject_id);
  `);
  // pgvector is optional; the semantic layer falls back to lexical search
  // when unavailable (documented in README).
  try {
    await db.exec(`CREATE EXTENSION IF NOT EXISTS vector;`);
    await db.exec(`ALTER TABLE signals ADD COLUMN IF NOT EXISTS embedding vector(256);`);
  } catch {
    // extension unavailable — lexical search remains the default path
  }
}
