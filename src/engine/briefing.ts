import type { PGlite } from "@electric-sql/pglite";
import type { Briefing, BriefCard, DeclinedCard, ScoreResult } from "./types.js";
import { newRunId } from "./score.js";

export const BRIEF_RANK_LIMIT = 10;

/**
 * Weekly Briefing (PRD §5.1): ranked ≤10 + declined section. The declined
 * section is the recall safety net — insufficient_data is a valid reason,
 * and nothing is ever silently dropped (PRD §6.4, FR-6).
 */
export async function buildBriefing(db: PGlite, scores: ScoreResult[], previousRunId?: string | null): Promise<Briefing> {
  const runId = newRunId("brief");

  const previous = new Map<string, number>();
  if (previousRunId) {
    const rows = await db.query<{ subject_id: string; total: number }>(
      `SELECT DISTINCT ON (subject_id) subject_id, total
       FROM scores WHERE run_id = $1
       ORDER BY subject_id, created_at DESC`,
      [previousRunId]
    );
    for (const r of rows.rows) previous.set(r.subject_id, r.total);
  }

  const eligible = scores.filter((s) => s.subject_type === "company");
  // Error asymmetry (PRD §6.4): thin evidence never ranks — it goes to the
  // declined section as insufficient_data, whatever its raw score. Ranked-10
  // is tuned for recall at the evidence bar, and every rejection is
  // reconstructable.
  const MIN_EVIDENCE_TO_RANK = 3;
  const sufficient = eligible.filter((s) => s.evidence_count >= MIN_EVIDENCE_TO_RANK);
  const thin = eligible.filter((s) => s.evidence_count < MIN_EVIDENCE_TO_RANK);
  const ranked = [...sufficient].sort((a, b) => b.total - a.total || b.confidence - a.confidence);

  const cards: BriefCard[] = ranked.slice(0, BRIEF_RANK_LIMIT).map((s, i) => ({
    rank: i + 1,
    subject_id: s.subject_id,
    name: s.subject_name,
    domain: String((s as unknown as { domain?: string }).domain ?? ""),
    score: Number(s.total.toFixed(2)),
    confidence: s.confidence,
    why_now: s.why_now,
    delta: previous.has(s.subject_id) ? Number((s.total - (previous.get(s.subject_id) ?? 0)).toFixed(2)) : null,
    bear_case: s.bear_case,
    evidence_count: s.evidence_count,
    first_seen: s.first_seen,
  }));

  const declined: DeclinedCard[] = [];
  for (const s of thin) {
    declined.push({
      subject_id: s.subject_id,
      name: s.subject_name,
      reason: "insufficient_data",
      detail: `Only ${s.evidence_count} usable evidence item(s) — flagged for human review rather than ranked.`,
    });
  }
  for (const s of ranked.slice(BRIEF_RANK_LIMIT)) {
    declined.push({
      subject_id: s.subject_id,
      name: s.subject_name,
      reason: "below_rank_line",
      detail: `Score ${s.total.toFixed(2)} below rank line; bear case: ${s.bear_case.slice(0, 140)}`,
    });
  }

  return {
    run_id: runId,
    generated_at: new Date().toISOString(),
    rubric_version: scores[0]?.rubric_version ?? "v0",
    provider: scores[0]?.provider ?? "unknown",
    cards,
    declined,
  };
}

export function renderBriefing(b: Briefing): string {
  const lines: string[] = [];
  lines.push(`# Weekly Briefing — ${b.generated_at.slice(0, 10)}`);
  lines.push(`run ${b.run_id} · rubric ${b.rubric_version} · provider ${b.provider}`);
  lines.push("");
  for (const c of b.cards) {
    lines.push(`## #${c.rank} ${c.name} — score ${c.score} · confidence ${c.confidence}${c.delta !== null ? ` · delta ${c.delta >= 0 ? "+" : ""}${c.delta}` : ""}`);
    for (const w of c.why_now) lines.push(`- why now: ${w}`);
    lines.push(`- bear case: ${c.bear_case}`);
    lines.push(`- evidence: ${c.evidence_count} item(s) · first seen ${c.first_seen}`);
    lines.push("");
  }
  lines.push(`## Declined (${b.declined.length}) — nothing silently dropped`);
  for (const d of b.declined) {
    lines.push(`- ${d.name} — ${d.reason}: ${d.detail}`);
  }
  return lines.join("\n");
}

export async function latestRunId(db: PGlite, kind: string): Promise<string | null> {
  const rows = await db.query<{ id: string }>(
    `SELECT id FROM runs WHERE kind=$1 ORDER BY created_at DESC LIMIT 1`,
    [kind]
  );
  return rows.rows[0]?.id ?? null;
}
