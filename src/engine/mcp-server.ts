import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { getDb } from "./db.js";
import { getProvider } from "./providers/index.js";
import { assemblePack, findEntityByName } from "./pack.js";
import { scoreSubject, newRunId } from "./score.js";
import { buildBriefing, latestRunId } from "./briefing.js";
import { buildDossier, renderDossier } from "./dossier.js";
import { searchSignals } from "./signals.js";
import { runCalibration, renderCalibration } from "./calibration.js";
import { warmPathFor } from "./adapters/crm-synthetic.js";

/**
 * MCP server (PRD §12): the intelligence as tools for agents. Any Claude Code
 * session can consume the graph, the signal search, the scorecards, and the
 * calibration report — the institution, wired into an agent workflow.
 */
export async function startMcp(): Promise<void> {
  const server = new McpServer({ name: "triage", version: "0.1.0" });

  server.tool(
    "triage_search_signals",
    "Semantic-ish signal search across the ingested corpus (lexical fallback; citations included)",
    { query: z.string().describe("search terms"), limit: z.number().optional().describe("max results (default 10)") },
    async ({ query, limit }) => {
      const db = await getDb();
      const results = await searchSignals(db, query, limit ?? 10);
      const text = results
        .map((r) => `[${r.id}] ${r.occurred_at ?? ""} ${r.stale ? "(STALE) " : ""}${r.text} — ${r.source}`)
        .join("\n") || "no matching signals";
      return { content: [{ type: "text", text }] };
    }
  );

  server.tool(
    "triage_dossier",
    "Full dossier for a company: signal timeline, graph neighborhood, warm path, latest scorecard",
    { company: z.string().describe("company name, e.g. 'Corvia Care'") },
    async ({ company }) => {
      const db = await getDb();
      const entity = await findEntityByName(db, company);
      if (!entity) return { content: [{ type: "text", text: `unknown company: ${company}` }] };
      const view = await buildDossier(db, entity.id);
      return { content: [{ type: "text", text: renderDossier(view) }] };
    }
  );

  server.tool(
    "triage_warm_path",
    "Warm path from the firm's network roots to a company (relationship intelligence)",
    { company: z.string().describe("company name") },
    async ({ company }) => {
      const db = await getDb();
      const entity = await findEntityByName(db, company);
      if (!entity) return { content: [{ type: "text", text: `unknown company: ${company}` }] };
      const warm = await warmPathFor(db, entity.id);
      const text = warm.found && warm.path ? `${warm.path.join(" → ")}\nvia:\n- ${(warm.via ?? []).join("\n- ")}` : "no warm path ≤3 hops";
      return { content: [{ type: "text", text }] };
    }
  );

  server.tool(
    "triage_score",
    "Generate an evidence-linked scorecard for a company (runs the judgment layer: draft → citation gate → red-team)",
    { company: z.string().describe("company name") },
    async ({ company }) => {
      const db = await getDb();
      const entity = await findEntityByName(db, company);
      if (!entity) return { content: [{ type: "text", text: `unknown company: ${company}` }] };
      const provider = getProvider();
      const pack = await assemblePack(db, entity.id, "v0");
      const result = await scoreSubject(db, provider, pack, newRunId("mcp-score"));
      const text = [
        `${result.subject_name}: ${result.total.toFixed(2)} (confidence ${result.confidence}) · rubric ${result.rubric_version} · provider ${result.provider} · pack ${result.pack_hash}`,
        "",
        ...result.dimensions.map((d) => `${d.key}: ${d.score}/4 — ${d.rationale} [evidence: ${d.evidence.join(", ")}]`),
        "",
        `Bear case: ${result.bear_case}`,
      ].join("\n");
      return { content: [{ type: "text", text }] };
    }
  );

  server.tool(
    "triage_brief",
    "Generate this week's ranked briefing (runs scoring across the corpus; returns the ranked list + declined section)",
    {},
    async () => {
      const db = await getDb();
      const provider = getProvider();
      const runId = newRunId("brief-scores");
      const companyRows = await db.query<{ id: string }>(
        `SELECT id FROM entities WHERE type='company' AND simulated=true AND id LIKE 'sim:%' ORDER BY name`
      );
      const scores = [];
      for (const row of companyRows.rows) {
        const pack = await assemblePack(db, row.id, "v0");
        scores.push(await scoreSubject(db, provider, pack, runId));
      }
      const previous = await latestRunId(db, "brief");
      const briefing = await buildBriefing(db, scores, previous);
      await db.query(`INSERT INTO runs (id, kind, config) VALUES ($1,'brief',$2)`, [
        briefing.run_id,
        JSON.stringify({ score_run: runId, provider: provider.id, count: scores.length }),
      ]);
      const text = briefing.cards
        .map((c) => `#${c.rank} ${c.name} — ${c.score} (conf ${c.confidence}${c.delta !== null ? `, Δ ${c.delta}` : ""})\n  why now: ${c.why_now[0] ?? "—"}\n  bear: ${c.bear_case.slice(0, 160)}`)
        .join("\n\n") +
        `\n\nDeclined (${briefing.declined.length}):\n${briefing.declined.map((d) => `- ${d.name}: ${d.reason}`).join("\n")}`;
      return { content: [{ type: "text", text }] };
    }
  );

  server.tool(
    "triage_calibration_report",
    "Run the calibration eval against the golden set and return the honest report",
    {},
    async () => {
      const db = await getDb();
      const report = await runCalibration(db, getProvider());
      return { content: [{ type: "text", text: renderCalibration(report) }] };
    }
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
