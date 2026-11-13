import { Command } from "commander";
import { getDb } from "./db.js";
import { seedCorpus, countRows, findEntityNameSeed } from "./pipeline.js";
import { getProvider } from "./providers/index.js";
import { assemblePack } from "./pack.js";
import { scoreSubject, newRunId } from "./score.js";
import { buildBriefing, renderBriefing, latestRunId } from "./briefing.js";
import { buildDossier, renderDossier } from "./dossier.js";
import { renderMemo } from "./memo.js";
import { runCalibration, renderCalibration } from "./calibration.js";
import { startMcp } from "./mcp-server.js";
import { ClinicalTrialsAdapter } from "./adapters/clinicaltrials.js";
import { OpenFdaAdapter } from "./adapters/openfda.js";
import { resolveEntity } from "./resolve.js";
import { insertSignal } from "./corpus.js";

const program = new Command();
program.name("triage").description("Evidence-linked decision support for early-stage healthcare investing");

program
  .command("seed")
  .description("Load the watermarked synthetic corpus into the local store")
  .action(async () => {
    const result = await seedCorpus();
    console.log(`seeded: ${result.entities} entities, ${result.edges} edges, ${result.signals} signals`);
    if (result.skipped.length > 0) console.log(`contamination-guard skipped: ${result.skipped.join(", ")}`);
  });

program
  .command("ingest")
  .description("Run live source adapters (ClinicalTrials.gov, openFDA) — real, citable signals")
  .option("--live", "actually fetch from public APIs (network required)")
  .option("--since <date>", "fetch signals occurring after this date", "2026-06-01")
  .action(async (opts: { live?: boolean; since: string }) => {
    if (!opts.live) {
      console.log("dry-run: adapters present and typechecked. Re-run with --live to fetch (PRD §14: automate one scheduled job on one source to prove the pattern).");
      return;
    }
    const db = await getDb();
    const adapters = [new ClinicalTrialsAdapter(), new OpenFdaAdapter()];
    let inserted = 0;
    for (const adapter of adapters) {
      console.log(`ingest: ${adapter.id} — ${adapter.describe()}`);
      try {
        const raws = await adapter.fetchLatest(opts.since);
        for (const raw of raws) {
          const entityIds: string[] = [];
          for (const name of raw.entity_names) {
            const resolved = await resolveEntity(db, { type: "company", name, data: { via: adapter.id } });
            entityIds.push(resolved.id);
          }
          const signal = {
            id: raw.id, type: raw.type, source: raw.source, source_url: raw.source_url,
            occurred_at: raw.occurred_at, fetched_at: new Date().toISOString(),
            raw_ref: raw.source_url, text: raw.text, simulated: false,
          };
          await insertSignal(signal, entityIds);
          inserted++;
        }
        console.log(`  ${raws.length} signal(s)`);
      } catch (err) {
        console.error(`  failed: ${String(err).slice(0, 200)}`);
      }
    }
    console.log(`ingest complete: ${inserted} real signal(s); see review queue for near-merge candidates.`);
  });

program
  .command("brief")
  .description("Score all corpus companies and render the ranked weekly briefing")
  .action(async () => {
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
    console.log(renderBriefing(briefing));
  });

program
  .command("dossier")
  .requiredOption("--name <name>", "company name")
  .action(async (opts: { name: string }) => {
    const db = await getDb();
    const id = await findEntityNameSeed(db, opts.name);
    if (!id) {
      console.error(`no entity named '${opts.name}'`);
      process.exitCode = 1;
      return;
    }
    console.log(renderDossier(await buildDossier(db, id)));
  });

program
  .command("score")
  .requiredOption("--name <name>", "company or person name")
  .action(async (opts: { name: string }) => {
    const db = await getDb();
    const provider = getProvider();
    const id = await findEntityNameSeed(db, opts.name);
    if (!id) {
      console.error(`no entity named '${opts.name}'`);
      process.exitCode = 1;
      return;
    }
    const pack = await assemblePack(db, id, "v0");
    const result = await scoreSubject(db, provider, pack, newRunId("score"));
    console.log(JSON.stringify(result, null, 2));
  });

program
  .command("memo")
  .requiredOption("--name <name>", "company name")
  .action(async (opts: { name: string }) => {
    const db = await getDb();
    const id = await findEntityNameSeed(db, opts.name);
    if (!id) {
      console.error(`no entity named '${opts.name}'`);
      process.exitCode = 1;
      return;
    }
    const dossier = await buildDossier(db, id);
    if (!dossier.scorecard) {
      console.error("no scorecard yet — run `pnpm brief` first");
      process.exitCode = 1;
      return;
    }
    console.log(renderMemo(dossier.scorecard));
  });

program
  .command("calibrate")
  .description("Back-score the golden set and produce the calibration report")
  .option("--quiet", "print only the headline statistics")
  .action(async (opts: { quiet?: boolean }) => {
    const db = await getDb();
    const provider = getProvider();
    const report = await runCalibration(db, provider);
    if (opts.quiet) {
      console.log(JSON.stringify({ provider: report.provider, n: report.n_confirmed, rho: report.spearman_rho, lift: report.lift }));
    } else {
      console.log(renderCalibration(report));
    }
  });

program
  .command("mcp")
  .description("Start the MCP stdio server exposing the intelligence to agents")
  .action(async () => {
    await startMcp();
  });

program.parseAsync(process.argv).catch((err) => {
  console.error(String(err));
  process.exit(1);
});

void countRows;
