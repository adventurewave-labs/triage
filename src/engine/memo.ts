import type { ScoreResult } from "./types.js";
import { dimensionsFor, rubric } from "./rubric.js";

/**
 * IC Memo generator (PRD §5.4 / FR-4): inline citations + two required
 * sections — Unknowns and What-would-change-my-mind. Unknowns are derived
 * mechanically: dimensions scored on thin evidence, and unresolved
 * discrepancies. The memo never invents resolution where sources conflict.
 */
export function renderMemo(score: ScoreResult): string {
  const lines: string[] = [];
  const dims = dimensionsFor(score.subject_type);
  lines.push(`# IC Memo — ${score.subject_name}`);
  lines.push("");
  lines.push(`rubric ${score.rubric_version} · provider ${score.provider} · pack ${score.pack_hash} · total ${score.total.toFixed(2)} · confidence ${score.confidence}`);
  lines.push("");

  lines.push("## Scorecard");
  for (const d of score.dimensions) {
    const def = dims.find((x) => x.key === d.key);
    lines.push(`\n### ${d.key} — ${d.score}/4 (weight ${def?.weight ?? "?"})`);
    lines.push(`${d.rationale}`);
    for (const e of d.evidence) {
      const item = score.red_team.challenges.find((c) => c.evidence.includes(e));
      lines.push(`- evidence [${e}]${item ? " (challenged)" : ""}`);
    }
    if (d.counter_evidence.length > 0) {
      lines.push(`- counter-evidence: ${d.counter_evidence.join(", ")}`);
    }
  }

  lines.push("");
  lines.push("## Bear case (red-team survivors)");
  lines.push(score.bear_case);

  lines.push("");
  lines.push("## Unknowns");
  const thin = score.dimensions.filter(
    (d) => d.score > 0 && d.evidence.length < rubric.rules.minEvidencePerDimension
  );
  const zero = score.dimensions.filter((d) => d.score === 0);
  if (thin.length === 0 && zero.length === 0) {
    lines.push("- None recorded in corpus at current evidence bar.");
  } else {
    for (const t of thin) lines.push(`- ${t.key}: scored on thin evidence (${t.evidence.length} item(s)) — unresolved.`);
    for (const z of zero) lines.push(`- ${z.key}: no credible evidence available — unresolved.`);
  }

  lines.push("");
  lines.push("## What would change my mind");
  const counterRefs = new Set(score.dimensions.flatMap((d) => d.counter_evidence));
  if (counterRefs.size > 0) {
    for (const ref of counterRefs) lines.push(`- Follow-up on [${ref}] — if the negative signal resolves, several dimension scores move.`);
  }
  for (const c of score.red_team.challenges.filter((c) => c.sustained).slice(0, 3)) {
    lines.push(`- Resolving the red-team challenge on '${c.dimension}' would move the score: ${c.challenge.slice(0, 160)}`);
  }
  if (counterRefs.size === 0 && score.red_team.challenges.length === 0) {
    lines.push("- Red-team pass found no surviving counterargument at the current evidence bar; raising the bar (more sources) is the only known path to a revision.");
  }

  lines.push("");
  lines.push(`*Reproducibility: rubric ${score.rubric_version} · provider ${score.provider} · pack ${score.pack_hash} — re-runnable per the contract in PRD §8.3.*`);
  return lines.join("\n");
}
