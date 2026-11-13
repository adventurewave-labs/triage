import type { PGlite } from "@electric-sql/pglite";
import type { ScoreResult } from "./types.js";
import { getEntity } from "./pack.js";
import { signalsFor } from "./signals.js";
import { neighbors } from "./graph.js";
import { warmPathFor } from "./adapters/crm-synthetic.js";
import { overridesForScore } from "./overrides.js";

export interface DossierView {
  entity: { id: string; name: string; type: string; data: Record<string, unknown> } | null;
  timeline: Array<{ id: string; type: string; text: string; source: string; occurred_at?: string; stale?: boolean }>;
  neighborhood: Array<{ id: string; name: string; type: string; hop: number }>;
  warm_path: { found: boolean; path?: string[]; via?: string[] };
  scorecard: ScoreResult | null;
  latest_score_id: number | null;
  overrides: Array<{ id: number; verdict: string; reason_code: string; note: string; created_at: string }>;
}

export async function buildDossier(db: PGlite, subjectId: string): Promise<DossierView> {
  const entity = await getEntity(db, subjectId);
  const timeline = await signalsFor(db, subjectId);
  const neighborhood = await neighbors(db, subjectId, 2, 12);
  const warm = await warmPathFor(db, subjectId);
  const scoreRows = await db.query<{
    id: number;
    total: number; confidence: number; rubric_version: string; provider: string; pack_hash: string;
    dimensions: unknown; bear_case: string; why_now: unknown; evidence_count: number; first_seen: string; red_team: unknown; run_id: string;
  }>(
    `SELECT id, total, confidence, rubric_version, provider, pack_hash, dimensions, bear_case,
            why_now, evidence_count, first_seen::text, red_team, run_id
     FROM scores WHERE subject_id=$1 ORDER BY created_at DESC LIMIT 1`,
    [subjectId]
  );
  let scorecard: ScoreResult | null = null;
  const row = scoreRows.rows[0];
  if (row) {
    // PGlite returns JSONB columns already-parsed; handle both shapes.
    const parse = <T>(value: unknown): T =>
      typeof value === "string" ? (JSON.parse(value) as T) : (value as T);
    scorecard = {
      subject_id: subjectId,
      subject_name: entity?.name ?? subjectId,
      subject_type: entity?.type as ScoreResult["subject_type"],
      rubric_version: row.rubric_version,
      provider: row.provider,
      run_id: row.run_id,
      pack_hash: row.pack_hash,
      total: row.total,
      confidence: row.confidence,
      dimensions: parse<ScoreResult["dimensions"]>(row.dimensions),
      bear_case: row.bear_case,
      why_now: parse<string[]>(row.why_now),
      evidence_count: row.evidence_count,
      first_seen: row.first_seen,
      red_team: parse<ScoreResult["red_team"]>(row.red_team),
    };
  }
  const overrides = row ? await overridesForScore(db, row.id) : [];
  return {
    entity: entity ? { id: entity.id, name: entity.name, type: entity.type, data: entity.data } : null,
    timeline,
    neighborhood,
    warm_path: warm,
    scorecard,
    latest_score_id: row?.id ?? null,
    overrides,
  };
}

export function renderDossier(v: DossierView): string {
  if (!v.entity) return `Unknown subject.`;
  const lines: string[] = [];
  lines.push(`# Dossier — ${v.entity.name}`);
  lines.push(`type: ${v.entity.type} · ${JSON.stringify(v.entity.data)}`);
  lines.push("");
  lines.push("## Signal timeline (newest first; stale flagged)");
  if (v.timeline.length === 0) lines.push("- (none)");
  for (const t of v.timeline) {
    lines.push(`- ${t.occurred_at ?? "?"} [${t.type}${t.stale ? " · STALE" : ""}] ${t.text}  (${t.source})`);
  }
  lines.push("");
  lines.push("## Graph neighborhood (≤2 hops)");
  if (v.neighborhood.length === 0) lines.push("- (isolated)");
  for (const n of v.neighborhood) {
    lines.push(`- ${n.name} [${n.type}] hop=${n.hop}`);
  }
  lines.push("");
  lines.push("## Warm path");
  if (v.warm_path.found && v.warm_path.path) {
    lines.push(`- ${v.warm_path.path.join(" → ")}`);
    for (const via of v.warm_path.via ?? []) lines.push(`  - via ${via}`);
  } else {
    lines.push("- No warm path ≤3 hops from network roots.");
  }
  if (v.scorecard) {
    const s = v.scorecard;
    lines.push("");
    lines.push(`## Scorecard — ${s.total.toFixed(2)} · confidence ${s.confidence} · rubric ${s.rubric_version} · provider ${s.provider} · pack ${s.pack_hash}`);
    for (const d of s.dimensions) {
      lines.push(`\n### ${d.key}: ${d.score}/4`);
      lines.push(`- ${d.rationale}`);
      lines.push(`- evidence: ${d.evidence.join(", ")}`);
      if (d.counter_evidence.length > 0) lines.push(`- counter: ${d.counter_evidence.join(", ")}`);
    }
    lines.push("");
    lines.push(`**Bear case:** ${s.bear_case}`);
  } else {
    lines.push("");
    lines.push("## Scorecard");
    lines.push("- Not yet scored. Run `pnpm brief` or `pnpm score --name`.");
  }
  return lines.join("\n");
}
