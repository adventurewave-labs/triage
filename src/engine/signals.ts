import type { PGlite } from "@electric-sql/pglite";
import type { PackItem } from "./types.js";
import { demoNow } from "./corpus.js";
import rubricRules from "../../rubric/v0.json" with { type: "json" };

const RULES = (rubricRules as { rules: { evidenceStalenessWindows: Record<string, number> } }).rules;

export function daysBetween(from: string, to: string): number {
  const a = new Date(from).getTime();
  const b = new Date(to).getTime();
  return Math.max(0, Math.round((b - a) / 86_400_000));
}

export function stalenessWindow(type: string): number {
  return RULES.evidenceStalenessWindows[type] ?? 365;
}

export function isStale(type: string, occurredAt: string, now?: string): boolean {
  const clock = now ?? demoNow();
  return daysBetween(occurredAt, clock) > stalenessWindow(type);
}

/** Signals attached to an entity, newest first, with staleness flags. */
export async function signalsFor(db: PGlite, entityId: string): Promise<Array<PackItem & { type: string }>> {
  const rows = await db.query<{
    id: string; type: string; text: string; source: string; occurred_at: string; simulated: boolean;
  }>(
    `SELECT s.id, s.type, s.text, s.source, s.occurred_at::text, s.simulated
     FROM signals s JOIN signal_entities se ON se.signal_id = s.id
     WHERE se.entity_id = $1
     ORDER BY s.occurred_at DESC`,
    [entityId]
  );
  return rows.rows.map((r) => ({
    id: r.id,
    kind: "signal" as const,
    text: r.text,
    source: r.source,
    occurred_at: r.occurred_at,
    stale: isStale(r.type, r.occurred_at),
    type: r.type,
  }));
}

/**
 * Lexical signal search — the default retrieval path. Semantic (pgvector)
 * search activates when embeddings exist; this fallback keeps the system
 * fully functional offline (documented in README).
 */
export async function searchSignals(db: PGlite, query: string, limit = 20): Promise<Array<PackItem & { type: string }>> {
  const terms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
  const rows = await db.query<{
    id: string; type: string; text: string; source: string; occurred_at: string;
  }>(
    `SELECT s.id, s.type, s.text, s.source, s.occurred_at::text
     FROM signals s
     ORDER BY s.occurred_at DESC
     LIMIT 500`
  );
  const scored = rows.rows
    .map((r) => {
      const hay = r.text.toLowerCase();
      const hits = terms.filter((t) => hay.includes(t)).length;
      const recency = 1 / (1 + daysBetween(r.occurred_at, demoNow()) / 90);
      return { row: r, relevance: hits * recency };
    })
    .filter((x) => x.relevance > 0)
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, limit);
  return scored.map((x) => ({
    id: x.row.id,
    kind: "signal" as const,
    text: x.row.text,
    source: x.row.source,
    occurred_at: x.row.occurred_at,
    stale: isStale(x.row.type, x.row.occurred_at),
    type: x.row.type,
  }));
}
