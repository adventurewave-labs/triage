import type { PGlite } from "@electric-sql/pglite";
import goldenFile from "../../golden-set/golden-set.json" with { type: "json" };
import type { EvidencePack, ScoreResult } from "./types.js";
import { packFromSummaries } from "./pack.js";
import { dimensionsFor, RUBRIC_VERSION } from "./rubric.js";
import type { JudgeProvider } from "./providers/index.js";
import { scoreSubject } from "./score.js";

interface GoldenEntry {
  name: string;
  segment: string;
  seriesWindow: string;
  outcome: "up" | "down" | "flat";
  label_status: "confirmed" | "candidate";
  events: string[];
  evidence: Array<{ text: string; source: string }>;
}

const OUTCOME_ORDINAL: Record<string, number> = { down: 0, flat: 1, up: 2 };

/** Contamination guard: golden names never enter the live corpus (PRD §10). */
export async function assertNoContamination(db: PGlite): Promise<void> {
  const entries = goldenFile.entries as GoldenEntry[];
  const rows = await db.query<{ name: string }>(`SELECT name FROM entities WHERE type='company'`);
  const corpusNames = new Set(rows.rows.map((r) => r.name.toLowerCase()));
  const clashes = entries.filter((e) => corpusNames.has(e.name.toLowerCase()));
  if (clashes.length > 0) {
    throw new Error(`eval contamination: golden-set companies present in live corpus: ${clashes.map((c) => c.name).join(", ")}`);
  }
}

export interface CalibrationReport {
  run_id: string;
  provider: string;
  n_confirmed: number;
  n_candidate: number;
  excluded: number;
  spearman_rho: number;
  lift: { topThirdShareUp: number; bottomThirdShareDown: number };
  scored: Array<{ name: string; outcome: string; status: string; score: number }>;
  honestNote: string;
}

function spearmanRho(pairs: Array<{ x: number; y: number }>): number {
  const n = pairs.length;
  if (n < 3) return Number.NaN;
  const rank = (values: number[]): number[] => {
    const sorted = values.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
    const ranks = new Array<number>(values.length);
    let i = 0;
    while (i < sorted.length) {
      let j = i;
      while (j + 1 < sorted.length && sorted[j + 1]!.v === sorted[i]!.v) j++;
      const avg = (i + j) / 2 + 1;
      for (let k = i; k <= j; k++) ranks[sorted[k]!.i] = avg;
      i = j + 1;
    }
    return ranks;
  };
  const rx = rank(pairs.map((p) => p.x));
  const ry = rank(pairs.map((p) => p.y));
  const mean = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
  const mx = mean(rx);
  const my = mean(ry);
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let k = 0; k < n; k++) {
    num += (rx[k]! - mx) * (ry[k]! - my);
    dx += (rx[k]! - mx) ** 2;
    dy += (ry[k]! - my) ** 2;
  }
  if (dx === 0 || dy === 0) return Number.NaN;
  return num / Math.sqrt(dx * dy);
}

/**
 * Calibration eval (PRD §9.1/9.2): back-score the golden set, correlate score
 * with outcome ordinal (down=0, flat=1, up=2). Confirmed entries only.
 * The provider label is carried through — the heuristic stand-in's bias is
 * documented, not hidden (methodology: known confounds).
 */
export async function runCalibration(db: PGlite, provider: JudgeProvider): Promise<CalibrationReport> {
  await assertNoContamination(db);
  const entries = goldenFile.entries as GoldenEntry[];
  const runId = `calib-${Date.now().toString(36)}`;
  const scored: CalibrationReport["scored"] = [];

  for (const entry of entries) {
    const pack: EvidencePack = packFromSummaries(entry.name, entry.evidence, RUBRIC_VERSION);
    const dims = dimensionsFor("company").map((d) => ({ key: d.key, measures: d.measures }));
    const draft = await provider.draft(pack, dims);
    const result = await scoreSubject(db, provider, pack, runId);
    void dims;
    void draft;
    scored.push({
      name: entry.name,
      outcome: entry.outcome,
      status: entry.label_status,
      score: Number(result.total.toFixed(2)),
    });
  }

  const confirmed = scored.filter((s) => s.status === "confirmed");
  const pairs = confirmed.map((s) => ({ x: s.score, y: OUTCOME_ORDINAL[s.outcome] ?? 1 }));
  const rho = spearmanRho(pairs);

  const sortedByScore = [...confirmed].sort((a, b) => b.score - a.score);
  const third = Math.max(1, Math.floor(sortedByScore.length / 3));
  const topThird = sortedByScore.slice(0, third);
  const bottomThird = sortedByScore.slice(-third);
  const shareOf = (arr: CalibrationReport["scored"], outcome: string) =>
    arr.length === 0 ? 0 : arr.filter((s) => s.outcome === outcome).length / arr.length;

  return {
    run_id: runId,
    provider: provider.id,
    n_confirmed: confirmed.length,
    n_candidate: scored.length - confirmed.length,
    excluded: 0,
    spearman_rho: Number.isNaN(rho) ? Number.NaN : Number(rho.toFixed(3)),
    lift: {
      topThirdShareUp: Number(shareOf(topThird, "up").toFixed(2)),
      bottomThirdShareDown: Number(shareOf(bottomThird, "down").toFixed(2)),
    },
    scored,
    honestNote:
      "Directional only: n is small, CI on ρ is wide, and the provider label matters — the lexicon stand-in reads outcome-correlated language by construction (methodology, known confounds). The artifact being demonstrated is the harness's honesty, not a p-value.",
  };
}

export function renderCalibration(report: CalibrationReport): string {
  const lines: string[] = [];
  lines.push(`# Calibration Report — ${report.run_id}`);
  lines.push(`provider: ${report.provider}`);
  lines.push(`n confirmed: ${report.n_confirmed} · candidates: ${report.n_candidate} (computed over confirmed only)`);
  lines.push("");
  lines.push(`Spearman ρ (score vs outcome ordinal): ${report.spearman_rho}`);
  lines.push(`Lift — top third share 'up': ${report.lift.topThirdShareUp} · bottom third share 'down': ${report.lift.bottomThirdShareDown}`);
  lines.push("");
  lines.push("| company | outcome | status | score |");
  lines.push("|---|---|---|---|");
  for (const s of [...report.scored].sort((a, b) => b.score - a.score)) {
    lines.push(`| ${s.name} | ${s.outcome} | ${s.status} | ${s.score} |`);
  }
  lines.push("");
  lines.push(`**Honest read:** ${report.honestNote}`);
  return lines.join("\n");
}

export type { GoldenEntry, ScoreResult };
