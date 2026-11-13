import type { PGlite } from "@electric-sql/pglite";
import { networkRoots, warmPath } from "../graph.js";

/**
 * The synthetic CRM layer behind the swap-in adapter (PRD FR-9, §13):
 * in the portfolio version, relationships carry the `sim:` watermark. A real
 * deployment implements the same query surface against Affinity / DealCloud /
 * a warehouse — swap is config, not code.
 */
export interface WarmPathResult {
  found: boolean;
  path?: string[];
  names?: string[];
  via?: string[];
}

export async function warmPathFor(db: PGlite, entityId: string): Promise<WarmPathResult> {
  const roots = await networkRoots(db);
  if (roots.length === 0) return { found: false };
  const path = await warmPath(db, roots, entityId, 3);
  if (!path) return { found: false };
  return {
    found: true,
    path: path.names,
    via: path.edges.map((e) => `${e.type}: ${e.evidence}`),
  };
}
