import type { PGlite } from "@electric-sql/pglite";
import type { Briefing, BriefCard, DeclinedCard, ScoreResult } from "./types.js";
import { newRunId, scoreSubject } from "./score.js";
import { assemblePack } from "./pack.js";
import { RUBRIC_VERSION } from "./rubric.js";
import type { JudgeProvider } from "./providers/index.js";

export const BRIEF_RANK_LIMIT = 10;
export const MIN_EVIDENCE_TO_RANK = 3;

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
  const sufficient = eligible.filter((s) => s.evidence_count >= MIN_EVIDENCE_TO_RANK);
  const thin = eligible.filter((s) => s.evidence_count < MIN_EVIDENCE_TO_RANK);
  const ranked = [...sufficient].sort((a, b) => b.total - a.total || b.confidence - a.confidence);

  // Latest persisted score id per subject — powers the one-tap override loop.
  const scoreIds = new Map<string, number>();
  const idRows = await db.query<{ subject_id: string; id: number }>(
    `SELECT subject_id, MAX(id) AS id FROM scores GROUP BY subject_id`
  );
  for (const r of idRows.rows) scoreIds.set(r.subject_id, r.id);

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
    score_id: scoreIds.get(s.subject_id) ?? null,
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

/** Shared scoring pipeline — one implementation behind the CLI, MCP, and web surfaces. */
export async function runBriefingPipeline(db: PGlite, provider: JudgeProvider): Promise<Briefing> {
  const scoreRunId = newScoreRunId2("brief-scores");
  const companyRows = await db.query<{ id: string }>(
    `SELECT id FROM entities WHERE type='company' AND simulated=true AND id LIKE 'sim:%' ORDER BY name`
  );
  const scores: ScoreResult[] = [];
  for (const row of companyRows.rows) {
    const pack = await assemblePack(db, row.id, RUBRIC_VERSION);
    scores.push(await scoreSubject(db, provider, pack, scoreRunId));
  }
  const previous = await latestRunId(db, "brief");
  const briefing = await buildBriefing(db, scores, previous);
  await db.query(`INSERT INTO runs (id, kind, config) VALUES ($1,'brief',$2)`, [
    briefing.run_id,
    JSON.stringify({ score_run: scoreRunId, provider: provider.id, count: scores.length }),
  ]);
  return briefing;
}

function newScoreRunId2(kind: string): string {
  return newRunId(kind);
}

/**
 * DB-backed briefing view for read-only surfaces (web GET): reconstructs the
 * latest briefing from persisted scores without re-scoring.
 */
export async function briefingFromDb(db: PGlite): Promise<Briefing | null> {
  const runRows = await db.query<{ id: string; config: unknown }>(
    `SELECT id, config FROM runs WHERE kind='brief' ORDER BY created_at DESC LIMIT 2`
  );
  if (runRows.rows.length === 0) return null;
  const latest = runRows.rows[0]!;
  const scoreRunId = (latest.config as { score_run?: string } | undefined)?.score_run;
  if (!scoreRunId) return null;

  const rows = await db.query<{
    subject_id: string; subject_type: string; total: number; confidence: number;
    bear_case: string; why_now: unknown; evidence_count: number; first_seen: string; name: string; data: unknown;
  }>(
    `SELECT s.subject_id, s.subject_type, s.total, s.confidence, s.bear_case, s.why_now,
            s.evidence_count, s.first_seen::text, e.name, e.data
     FROM scores s JOIN entities e ON e.id = s.subject_id
     WHERE s.run_id = $1
     ORDER BY s.created_at DESC`,
    [scoreRunId]
  );
  const parse = <T>(v: unknown): T => (typeof v === "string" ? (JSON.parse(v) as T) : (v as T));
  const seen = new Set<string>();
  const scoreResults: ScoreResult[] = [];
  for (const r of rows.rows) {
    if (seen.has(r.subject_id)) continue;
    seen.add(r.subject_id);
    scoreResults.push({
      subject_id: r.subject_id,
      subject_name: r.name,
      subject_type: r.subject_type as ScoreResult["subject_type"],
      rubric_version: "v0",
      provider: "persisted",
      run_id: scoreRunId,
      pack_hash: "",
      total: r.total,
      confidence: r.confidence,
      dimensions: [],
      bear_case: r.bear_case,
      why_now: parse<string[]>(r.why_now),
      evidence_count: r.evidence_count,
      first_seen: r.first_seen,
      red_team: { challenges: [], summary: "" },
    });
  }

  const previous = runRows.rows[1];
  const prevScoreRunId = previous ? (previous.config as { score_run?: string } | undefined)?.score_run : undefined;
  const prevTotals = new Map<string, number>();
  if (prevScoreRunId) {
    const prevRows = await db.query<{ subject_id: string; total: number }>(
      `SELECT DISTINCT ON (subject_id) subject_id, total FROM scores WHERE run_id=$1 ORDER BY subject_id, created_at DESC`,
      [prevScoreRunId]
    );
    for (const r of prevRows.rows) prevTotals.set(r.subject_id, r.total);
  }

  const eligible = scoreResults.filter((s) => s.subject_type === "company");
  const sufficient = eligible.filter((s) => s.evidence_count >= MIN_EVIDENCE_TO_RANK);
  const thin = eligible.filter((s) => s.evidence_count < MIN_EVIDENCE_TO_RANK);
  const ranked = [...sufficient].sort((a, b) => b.total - a.total || b.confidence - a.confidence);

  const scoreIds = new Map<string, number>();
  const idRows = await db.query<{ subject_id: string; id: number }>(
    `SELECT subject_id, MAX(id) AS id FROM scores GROUP BY subject_id`
  );
  for (const r of idRows.rows) scoreIds.set(r.subject_id, r.id);

  const cards: BriefCard[] = ranked.slice(0, BRIEF_RANK_LIMIT).map((s, i) => ({
    rank: i + 1,
    subject_id: s.subject_id,
    name: s.subject_name,
    domain: "",
    score: Number(s.total.toFixed(2)),
    confidence: s.confidence,
    why_now: s.why_now,
    delta: prevTotals.has(s.subject_id) ? Number((s.total - (prevTotals.get(s.subject_id) ?? 0)).toFixed(2)) : null,
    bear_case: s.bear_case,
    evidence_count: s.evidence_count,
    first_seen: s.first_seen,
    score_id: scoreIds.get(s.subject_id) ?? null,
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
    run_id: latest.id,
    generated_at: new Date().toISOString(),
    rubric_version: RUBRIC_VERSION,
    provider: (latest.config as { provider?: string }).provider ?? "persisted",
    cards,
    declined,
  };
}
