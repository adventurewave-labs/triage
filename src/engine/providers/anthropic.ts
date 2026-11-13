import type { JudgeProvider } from "./types.js";
import type { DimensionScore, EvidencePack, RedTeamChallenge, RedTeamReport } from "../types.js";
import { anchorsText } from "../rubric.js";
import { z } from "zod";

const draftSchema = z.object({
  dimensions: z.array(
    z.object({
      key: z.string(),
      score: z.number().min(0).max(4),
      evidence: z.array(z.string()),
      counter_evidence: z.array(z.string()),
      rationale: z.string(),
    })
  ),
});

const redTeamSchema = z.object({
  challenges: z.array(
    z.object({
      dimension: z.string(),
      challenge: z.string(),
      evidence: z.array(z.string()),
    })
  ),
  summary: z.string(),
});

/**
 * Frontier judge. Fetch-based (no SDK dependency). Structured output is
 * schema-validated with zod; ONE retry on invalid output, then the call
 * fails and the card does not ship (PRD FR-8 enforcement posture).
 * Requires TRIAGE_ANTHROPIC_API_KEY.
 */
export class AnthropicProvider implements JudgeProvider {
  readonly id = "anthropic-frontier";
  private apiKey: string;
  private model: string;

  constructor(opts?: { apiKey?: string; model?: string }) {
    this.apiKey = opts?.apiKey ?? process.env.TRIAGE_ANTHROPIC_API_KEY ?? "";
    this.model = opts?.model ?? process.env.TRIAGE_ANTHROPIC_MODEL ?? "claude-sonnet-4-5";
    if (!this.apiKey) throw new Error("TRIAGE_ANTHROPIC_API_KEY not set");
  }

  private async complete(system: string, user: string, maxTokens = 4096): Promise<string> {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: maxTokens,
        system,
        messages: [{ role: "user", content: user }],
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`anthropic api error ${res.status}: ${body.slice(0, 300)}`);
    }
    const json = (await res.json()) as { content: Array<{ type: string; text?: string }> };
    const text = json.content.find((c) => c.type === "text")?.text ?? "";
    if (!text) throw new Error("anthropic: empty completion");
    return text;
  }

  private packText(pack: EvidencePack): string {
    return pack.items.map((i) => `[${i.id}] ${i.text} (source: ${i.source}${i.occurred_at ? `, ${i.occurred_at}` : ""}${i.stale ? " — STALE" : ""})`).join("\n");
  }

  async draft(pack: EvidencePack, dimensions: Array<{ key: string; measures: string }>): Promise<DimensionScore[]> {
    const system = [
      "You are the judgment layer of an investment triage system. Score every dimension 0-4.",
      "Hard rules: every dimension MUST cite at least 2 evidence item IDs from the pack; every claim must resolve to a cited item; consider counter-evidence explicitly.",
      "Scale anchors:",
      anchorsText(),
      "Return ONLY strict JSON matching: {\"dimensions\":[{\"key\":string,\"score\":number,\"evidence\":string[],\"counter_evidence\":string[],\"rationale\":string}]}",
    ].join("\n");
    const user = [
      `Rubric dimensions:\n${dimensions.map((d) => `- ${d.key}: ${d.measures}`).join("\n")}`,
      `Evidence pack (hash ${pack.hash}):\n${this.packText(pack)}`,
      "Score every dimension. JSON only.",
    ].join("\n\n");

    let lastError: unknown = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const raw = await this.complete(system, attempt === 0 ? user : `${user}\n\nREMINDER: strict JSON only, every dimension needs ≥2 evidence IDs.`);
        const parsed = draftSchema.parse(JSON.parse(raw));
        return parsed.dimensions;
      } catch (err) {
        lastError = err;
      }
    }
    throw new Error(`citation/schema gate failed after retry: ${String(lastError).slice(0, 200)}`);
  }

  async redTeam(pack: EvidencePack, dimensions: DimensionScore[]): Promise<RedTeamReport> {
    const system = [
      "You are the red-team pass of an investment triage system. Attack the draft scorecard:",
      "1) find claims whose cited evidence does not support them;",
      "2) find a stronger bear case than the drafted one;",
      "3) find the disqualifying fact the draft ignored.",
      "Every challenge must cite evidence item IDs from the pack.",
      'Return ONLY strict JSON matching: {"challenges":[{"dimension":string,"challenge":string,"evidence":string[]}],"summary":string}',
    ].join("\n");
    const user = [
      `Draft scorecard:\n${JSON.stringify(dimensions, null, 2)}`,
      `Evidence pack (hash ${pack.hash}):\n${this.packText(pack)}`,
      "Attack it. JSON only.",
    ].join("\n\n");
    const raw = await this.complete(system, user, 2048);
    const parsed = redTeamSchema.parse(JSON.parse(raw));
    // challenges are marked sustained; adjudication happens in score.ts
    const challenges: RedTeamChallenge[] = parsed.challenges.map((c) => ({ ...c, sustained: true }));
    return { challenges, summary: parsed.summary };
  }
}
