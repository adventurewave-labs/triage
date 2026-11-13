import type { PGlite } from "@electric-sql/pglite";

export interface GraphNode {
  id: string;
  name: string;
  type: string;
  hop: number;
}

export interface WarmPath {
  path: string[]; // entity ids, source → target
  names: string[];
  edges: Array<{ type: string; evidence: string }>;
}

/**
 * Neighborhood query: BFS up to maxHops, capped. Used by the dossier screen.
 */
export async function neighbors(db: PGlite, entityId: string, maxHops = 2, limit = 12): Promise<GraphNode[]> {
  const seen = new Map<string, GraphNode>([[entityId, { id: entityId, name: "(subject)", type: "root", hop: 0 }]]);
  let frontier = [entityId];
  for (let hop = 1; hop <= maxHops; hop++) {
    if (frontier.length === 0 || seen.size >= limit + 1) break;
    const next: string[] = [];
    for (const node of frontier) {
      const rows = await db.query<{ id: string; name: string; type: string }>(
        `SELECT e.id, e.name, e.type,
                (SELECT type FROM edges WHERE from_id=e.id LIMIT 1) AS edge_dir
         FROM (
           SELECT to_id AS id FROM edges WHERE from_id=$1
           UNION
           SELECT from_id AS id FROM edges WHERE to_id=$1
         ) x JOIN entities e ON e.id = x.id
         LIMIT $2`,
        [node, limit]
      );
      for (const row of rows.rows) {
        if (!seen.has(row.id)) {
          seen.set(row.id, { id: row.id, name: row.name, type: row.type, hop });
          next.push(row.id);
        }
      }
    }
    frontier = next;
  }
  return [...seen.values()].filter((n) => n.id !== entityId).slice(0, limit);
}

/**
 * Warm-path discovery: shortest path from any of `fromIds` (network roots)
 * to the target, over any edge type. Returns null when no path ≤ maxDepth.
 */
export async function warmPath(
  db: PGlite,
  fromIds: string[],
  targetId: string,
  maxDepth = 3
): Promise<WarmPath | null> {
  const names = new Map<string, string>();
  const entRows = await db.query<{ id: string; name: string }>(`SELECT id, name FROM entities`);
  for (const r of entRows.rows) names.set(r.id, r.name);

  interface Visit {
    id: string;
    path: string[];
    edgeTypes: Array<{ type: string; evidence: string }>;
  }
  const queue: Visit[] = fromIds.map((id) => ({ id, path: [id], edgeTypes: [] }));
  const visited = new Set<string>(fromIds);

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.path.length - 1 > maxDepth) continue;
    if (current.id === targetId && current.path.length > 1) {
      return {
        path: current.path,
        names: current.path.map((p) => names.get(p) ?? p),
        edges: current.edgeTypes,
      };
    }
    const rows = await db.query<{ other: string; type: string; evidence: string }>(
      `SELECT CASE WHEN from_id=$1 THEN to_id ELSE from_id END AS other, type, evidence
       FROM edges WHERE from_id=$1 OR to_id=$1`,
      [current.id]
    );
    for (const row of rows.rows) {
      if (visited.has(row.other)) continue;
      visited.add(row.other);
      queue.push({
        id: row.other,
        path: [...current.path, row.other],
        edgeTypes: [...current.edgeTypes, { type: row.type, evidence: row.evidence }],
      });
    }
  }
  return null;
}

/** Network roots: the firm's own people in the CRM layer (sim:knows sources). */
export async function networkRoots(db: PGlite): Promise<string[]> {
  const rows = await db.query<{ id: string }>(
    `SELECT DISTINCT from_id AS id FROM edges WHERE type='sim:knows'`
  );
  return rows.rows.map((r) => r.id);
}
