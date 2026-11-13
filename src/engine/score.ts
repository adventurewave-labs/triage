import crypto from "node:crypto";
import type { PGlite } from "@electric-sql/pglite";
import type { DimensionScore, EvidencePack, ScoreResult } from "./types.js";
import { dimensionsFor, RUBRIC_VERSION, rubric, deriveConfidence, weightedTotal } from "./rubric.js";
import type { JudgeProvider } from "./providers/index.js";

export class CitationGateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CitationGateError";
  }
}

/**
 * Citation gate — HARD, not advisory (PRD FR-8). Every dimension's evidence
 * refs must resolve to pack item IDs and meet the rubric minimum. Invalid
 * drafts are retried once upstream; a second violation fails the card.
 */
export function validateDimension(pack: EvidencePack, def: { key: string; minEvidence: number }, dim: DimensionScore): void {
  const packIds = new Set(pack.items.map((i) => i.id));
  const unknown = dim.evidence.filter((e) => !packIds.has(e));
  if (unknown.length > 0) {
    throw new CitationGateError(`dimension '${dim.key}' cites unresolved evidence: ${unknown.join(", ")}`);
  }
  if (dim.score > 0 && dim.evidence.length < Math.max(def.minEvidence, rubric.rules.minEvidencePerDimension)) {
    throw new CitationGateError(
      `dimension '${dim.key}' claims score ${dim.score} with ${dim.evidence.length} evidence item(s); rubric minimum is ${def.minEvidence}`
    );
  }
  if (dim.score < 0 || dim.score > 4) throw new CitationGateError(`dimension '${dim.key}' score ${dim.score} out of range`);
}

export function validateCitations(pack: EvidencePack, dimensions: DimensionScore[]): void {
  const dims = dimensionsFor(pack.subject_type);
  for (const dim of dimensions) {
    const def = dims.find((d) => d.key === dim.key);
    if (!def) throw new CitationGateError(`unknown dimension '${dim.key}'`);
    validateDimension(pack, def, dim);
  }
  const known = new Set(dimensions.map((d) => d.key));
  const missing = dims.filter((d) => !known.has(d.key));
  if (missing.length > 0) {
    throw new CitationGateError(`dimensions missing from draft: ${missing.map((m) => m.key).join(", ")}`);
  }
}

export function newRunId(kind: string): string {
  return `${kind}-${new Date().toISOString().slice(0, 10)}-${crypto.randomBytes(3).toString("hex")}`;
}

/**
 * The scoring loop (PRD §8.2): retrieve → draft → CITATION GATE → red-team →
 * adjudicate → final. The bear case is the output of the adversarial step,
 * not a genre convention.
 */
export async function scoreSubject(
  db: PGlite,
  provider: JudgeProvider,
  pack: EvidencePack,
  runId: string
): Promise<ScoreResult> {
  const dims = dimensionsFor(pack.subject_type).map((d) => ({ key: d.key, measures: d.measures }));

  let draft = await provider.draft(pack, dims);
  try {
    validateCitations(pack, draft);
  } catch (err) {
    if (provider.id === "mock-lexicon-v0") {
      // The deterministic provider cannot self-repair; the floor pass
      // validates each dimension on its own merits (refs + minimum evidence)
      // and honestly floors violators to 0 with the reason preserved.
      const dimsDefs = dimensionsFor(pack.subject_type);
      draft = draft.map((d) => {
        const def = dimsDefs.find((x) => x.key === d.key);
        try {
          if (def) validateDimension(pack, def, d);
          return d;
        } catch (dimErr) {
          return {
            key: d.key,
            score: 0,
            evidence: d.evidence.filter((e) => pack.items.some((i) => i.id === e)),
            counter_evidence: d.counter_evidence,
            rationale: `Citation gate: draft failed validation (${String(dimErr).slice(0, 140)}). Scored 0 — evidence floor applied.`,
          };
        }
      });
      validateCitations(pack, draft);
    } else {
      throw err;
    }
  }

  const redTeam = await provider.redTeam(pack, draft);

  // Adjudication: sustained challenges surface in the bear case verbatim.
  const sustained = redTeam.challenges.filter((c) => c.sustained);
  const bearParts = sustained
    .filter((c) => c.dimension === "*")
    .map((c) => c.challenge);
  for (const dim of draft) {
    const dimChallenges = sustained.filter((c) => c.dimension === dim.key);
    if (dimChallenges.length > 0 && dim.score > 1) {
      dim.score = Math.max(0, dim.score - 1);
      dim.rationale += ` Red-team: score reduced — ${dimChallenges.map((c) => c.challenge).join(" ")}`;
    }
  }

  const total = weightedTotal(draft);
  const confidence = deriveConfidence(draft);
  const entity = pack.items.find((i) => i.id === "pack:entity-card");
  const subjectName = entity ? entity.text.split(" — ")[0] ?? pack.subject_id : pack.subject_id;
  const signalItems = pack.items.filter((i) => i.kind === "signal" && !i.stale);
  const whyNow = signalItems
    .filter((i) => {
      const ageDays = i.occurred_at ? (Date.now() - new Date(i.occurred_at).getTime()) / 86_400_000 : Infinity;
      return ageDays <= 120;
    })
    .slice(0, 3)
    .map((i) => i.text);

  const result: ScoreResult = {
    subject_id: pack.subject_id,
    subject_name: subjectName,
    subject_type: pack.subject_type,
    rubric_version: RUBRIC_VERSION,
    provider: provider.id,
    run_id: runId,
    pack_hash: pack.hash,
    total,
    confidence,
    dimensions: draft,
    bear_case:
      bearParts.length > 0
        ? bearParts.join(" ")
        : redTeam.summary,
    why_now: whyNow,
    evidence_count: signalItems.length,
    first_seen: signalItems[signalItems.length - 1]?.occurred_at ?? new Date().toISOString().slice(0, 10),
    red_team: redTeam,
  };

  await db.query(
    `INSERT INTO scores (subject_id, subject_type, rubric_version, provider, run_id, pack_hash,
       total, confidence, dimensions, bear_case, why_now, evidence_count, first_seen, red_team)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
    [
      result.subject_id, result.subject_type, result.rubric_version, result.provider, result.run_id,
      result.pack_hash, result.total, result.confidence, JSON.stringify(result.dimensions),
      result.bear_case, JSON.stringify(result.why_now), result.evidence_count, result.first_seen,
      JSON.stringify(result.red_team),
    ]
  );

  return result;
}
