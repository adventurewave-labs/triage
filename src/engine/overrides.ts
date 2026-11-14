import type { PGlite } from "@electric-sql/pglite";
import type { OverrideReasonCode } from "./types.js";

const REASON_CODES: OverrideReasonCode[] = [
  "missing_evidence",
  "wrong_weight",
  "stale_data",
  "entity_error",
  "model_error",
  "judgment_differs",
];

export interface OverrideInput {
  score_id: number;
  verdict: "agree" | "disagree";
  reason_code: string;
  note: string;
  evidence_refs?: string[];
}

/**
 * Override loop (PRD §9.3): the system's memory. Must be expressible in
 * ≤10 seconds — one tap, one reason code, optional note. Overrides are
 * first-class objects and flow into the eval suite as cases.
 */
export async function recordOverride(db: PGlite, input: OverrideInput): Promise<{ id: number }> {
  if (!REASON_CODES.includes(input.reason_code as OverrideReasonCode)) {
    throw new Error(`invalid reason_code '${input.reason_code}'; valid: ${REASON_CODES.join(", ")}`);
  }
  if (input.verdict !== "agree" && input.verdict !== "disagree") {
    throw new Error("verdict must be 'agree' or 'disagree'");
  }
  const res = await db.query<{ id: number }>(
    `INSERT INTO overrides (score_id, verdict, reason_code, note, evidence_refs)
     VALUES ($1,$2,$3,$4,$5) RETURNING id`,
    [input.score_id, input.verdict, input.reason_code, input.note, JSON.stringify(input.evidence_refs ?? [])]
  );
  const id = res.rows[0]?.id;
  if (id === undefined) throw new Error("override insert failed");
  return { id };
}

export async function overridesForScore(db: PGlite, scoreId: number): Promise<Array<{ id: number; verdict: string; reason_code: string; note: string; created_at: string }>> {
  const rows = await db.query<{ id: number; verdict: string; reason_code: string; note: string; created_at: string }>(
    `SELECT id, verdict, reason_code, note, created_at::text FROM overrides WHERE score_id=$1 ORDER BY created_at DESC`,
    [scoreId]
  );
  return rows.rows;
}

export { REASON_CODES };
