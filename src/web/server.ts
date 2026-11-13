import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { getDb } from "../engine/db.js";
import { getProvider } from "../engine/providers/index.js";
import { runBriefingPipeline, briefingFromDb } from "../engine/briefing.js";
import { buildDossier } from "../engine/dossier.js";
import { recordOverride, REASON_CODES } from "../engine/overrides.js";
import { runCalibration } from "../engine/calibration.js";
import { layout, esc, scoreBadge, deltaHtml, safeBack } from "./html.js";

/**
 * Triage web UI — server-rendered, zero build. The ≤10-second override loop
 * (PRD §9.3) lives here: one tap + one reason code on any card.
 */
const app = new Hono();

app.get("/", async (c) => {
  const db = await getDb();
  const briefing = await briefingFromDb(db);
  const flash = c.req.query("flash");

  let body = "";
  if (flash) body += `<div class="flash">${esc(flash)}</div>\n`;
  body += `<form method="post" action="/run/brief" class="runbtn"><button>▸ Re-run scoring</button></form>\n`;

  if (!briefing || briefing.cards.length === 0) {
    body += `<div class="card"><h2>No briefing yet</h2>
      <p class="dim-note">Run scoring to produce the ranked first pass. Or from the CLI: <span class="evidence-id">pnpm brief</span></p>
      <form method="post" action="/run/brief"><button>▸ Run scoring now</button></form></div>`;
    return c.html(layout("Briefing", body, "brief"));
  }

  body += `<p class="dim-note">run ${esc(briefing.run_id)} · rubric ${esc(briefing.rubric_version)} · provider ${esc(briefing.provider)} · ${briefing.cards.length} ranked · ${briefing.declined.length} declined</p>\n`;

  for (const card of briefing.cards) {
    body += `<div class="card">
      <h2><span class="rank">#${card.rank}</span> <a href="/company/${encodeURIComponent(card.subject_id)}">${esc(card.name)}</a> ${scoreBadge(card.score)} <span class="conf">conf ${card.confidence}</span> ${deltaHtml(card.delta)}</h2>
      <ul class="why">${card.why_now.map((w) => `<li>${esc(w)}</li>`).join("") || '<li class="dim-note">no why-now drivers within 120 days</li>'}</ul>
      <div class="bear"><b>bear case</b> — ${esc(card.bear_case)}</div>
      <div class="dim-note">evidence: ${card.evidence_count} item(s) · first seen ${esc(card.first_seen)}</div>
      <form class="override" method="post" action="/override">
        <input type="hidden" name="score_id" value="${card.score_id ?? ""}">
        <input type="hidden" name="back" value="/">
        <button name="verdict" value="agree" class="agree">Agree</button>
        <button name="verdict" value="disagree" class="disagree">Disagree</button>
        <select name="reason_code">${REASON_CODES.map((r) => `<option value="${r}"${r === "judgment_differs" ? " selected" : ""}>${r}</option>`).join("")}</select>
        <input type="text" name="note" placeholder="optional note">
      </form>
    </div>\n`;
  }

  body += `<div class="card declined"><h2>Declined (${briefing.declined.length}) — nothing silently dropped</h2>`;
  if (briefing.declined.length === 0) body += `<p class="dim-note">none this week</p>`;
  else {
    body += `<table><tr><th>company</th><th>reason</th><th>detail</th></tr>`;
    for (const d of briefing.declined) {
      body += `<tr><td><a href="/company/${encodeURIComponent(d.subject_id)}">${esc(d.name)}</a></td><td class="reason">${esc(d.reason)}</td><td class="dim-note">${esc(d.detail)}</td></tr>`;
    }
    body += `</table>`;
  }
  body += `</div>`;

  return c.html(layout("Weekly Briefing", body, "brief"));
});

app.post("/run/brief", async (c) => {
  const db = await getDb();
  const briefing = await runBriefingPipeline(db, getProvider());
  return c.redirect(`/?flash=Briefing ${encodeURIComponent(briefing.run_id)} — ${briefing.cards.length} ranked, ${briefing.declined.length} declined`);
});

app.get("/company/:id", async (c) => {
  const db = await getDb();
  const id = c.req.param("id"); // Hono already decodes path params
  const view = await buildDossier(db, id);
  const flash = c.req.query("flash");
  if (!view.entity) {
    return c.html(layout("Unknown", `<div class="card"><h2>Unknown subject</h2><p class="dim-note">${esc(id)}</p></div>`), 404);
  }

  let body = "";
  if (flash) body += `<div class="flash">${esc(flash)}</div>\n`;
  body += `<div class="card"><h2>${esc(view.entity.name)} <span class="small">${esc(view.entity.type)} · ${esc(JSON.stringify(view.entity.data))}</span></h2>
    ${view.warm_path.found && view.warm_path.path ? `<div class="warm"><b>warm path</b> — ${esc(view.warm_path.path.join(" → "))}</div>` : `<div class="dim-note">no warm path ≤3 hops from network roots</div>`}
  </div>\n`;

  body += `<div class="card"><h2>Signal timeline</h2>`;
  if (view.timeline.length === 0) body += `<p class="dim-note">no signals on record</p>`;
  else {
    body += `<table><tr><th>date</th><th>type</th><th>signal</th><th>source</th></tr>`;
    for (const t of view.timeline) {
      body += `<tr><td class="evidence-id">${esc(t.occurred_at ?? "?")}</td><td>${esc(t.type)}${t.stale ? ' <span class="stale-tag">STALE</span>' : ""}</td><td>${esc(t.text)}</td><td class="dim-note">${esc(t.source)}</td></tr>`;
    }
    body += `</table>`;
  }
  body += `</div>\n`;

  body += `<div class="card"><h2>Graph neighborhood (≤2 hops)</h2><p class="dim-note">${view.neighborhood.map((n) => `${esc(n.name)} [${esc(n.type)}]`).join(" · ") || "isolated"}</p></div>\n`;

  if (view.scorecard && view.latest_score_id !== null) {
    const s = view.scorecard;
    body += `<div class="card"><h2>Scorecard ${scoreBadge(s.total)} <span class="conf">conf ${s.confidence} · rubric ${esc(s.rubric_version)} · provider ${esc(s.provider)} · pack ${esc(s.pack_hash)}</span></h2>`;
    for (const d of s.dimensions) {
      body += `<div class="dimline"><div class="head"><b>${esc(d.key)}</b><span class="dim-score">${d.score}/4</span></div>
        <div class="small">${esc(d.rationale)}</div>
        <div class="small">evidence: ${d.evidence.map((e) => `<span class="evidence-id">${esc(e)}</span>`).join(" ")}${d.counter_evidence.length > 0 ? ` · counter: ${d.counter_evidence.map((e) => `<span class="evidence-id">${esc(e)}</span>`).join(" ")}` : ""}</div>
      </div>`;
    }
    body += `<div class="bear"><b>bear case (red-team survivors)</b> — ${esc(s.bear_case)}</div>`;
    if (view.overrides.length > 0) {
      body += `<div class="small">overrides: ${view.overrides.map((o) => `${esc(o.verdict)}/${esc(o.reason_code)}${o.note ? ` ("${esc(o.note)}")` : ""}`).join(" · ")}</div>`;
    }
    body += `<form class="override" method="post" action="/override">
      <input type="hidden" name="score_id" value="${view.latest_score_id}">
      <input type="hidden" name="back" value="/company/${encodeURIComponent(id)}">
      <button name="verdict" value="agree" class="agree">Agree</button>
      <button name="verdict" value="disagree" class="disagree">Disagree</button>
      <select name="reason_code">${REASON_CODES.map((r) => `<option value="${r}"${r === "judgment_differs" ? " selected" : ""}>${r}</option>`).join("")}</select>
      <input type="text" name="note" placeholder="optional note">
    </form></div>\n`;
  } else {
    body += `<div class="card"><h2>Scorecard</h2><p class="dim-note">not scored yet — run the briefing</p></div>\n`;
  }

  return c.html(layout(view.entity.name, body));
});

app.post("/override", async (c) => {
  const db = await getDb();
  const form = await c.req.parseBody();
  const back = safeBack(form.back);
  const sep = back.includes("?") ? "&" : "?";
  try {
    await recordOverride(db, {
      score_id: Number(form.score_id),
      verdict: form.verdict === "agree" ? "agree" : "disagree",
      reason_code: String(form.reason_code),
      note: typeof form.note === "string" ? form.note : "",
    });
    return c.redirect(`${back}${sep}flash=${encodeURIComponent("Override recorded — it is now an eval case (§9.3)")}`);
  } catch (err) {
    return c.redirect(`${back}${sep}flash=${encodeURIComponent(`rejected: ${String(err).slice(0, 120)}`)}`);
  }
});

app.get("/calibration", async (c) => {
  const db = await getDb();
  const flash = c.req.query("flash");
  const rows = await db.query<{ config: unknown }>(
    `SELECT config FROM runs WHERE kind='calibration' ORDER BY created_at DESC LIMIT 1`
  );
  let body = "";
  if (flash) body += `<div class="flash">${esc(flash)}</div>\n`;
  body += `<form method="post" action="/run/calibration" class="runbtn"><button>▸ Run calibration eval</button></form>\n`;
  const config = rows.rows[0]?.config as { markdown?: string } | undefined;
  if (!config?.markdown) {
    body += `<div class="card"><h2>No calibration report yet</h2>
      <p class="dim-note">Back-scores the golden set (30 real digital-health outcomes) and correlates score with outcome. Confirmed entries only; provider labeled; honest note attached.</p></div>`;
  } else {
    body += `<div class="card"><pre style="white-space:pre-wrap;font-family:ui-monospace,monospace;font-size:12.5px;margin:0">${esc(config.markdown)}</pre></div>`;
  }
  return c.html(layout("Calibration", body, "calibration"));
});

app.post("/run/calibration", async (c) => {
  const db = await getDb();
  const report = await runCalibration(db, getProvider());
  const markdown = `provider: ${report.provider}\nn confirmed: ${report.n_confirmed} (candidates: ${report.n_candidate})\nSpearman rho: ${report.spearman_rho}\nLift: top third share 'up' = ${report.lift.topThirdShareUp} · bottom third share 'down' = ${report.lift.bottomThirdShareDown}\n\n${report.honestNote}`;
  await db.query(
    `INSERT INTO runs (id, kind, config) VALUES ($1,'calibration',$2)`,
    [`calib-web-${Date.now().toString(36)}`, JSON.stringify({ markdown, stats: { n: report.n_confirmed, rho: report.spearman_rho } })]
  );
  return c.redirect("/calibration?flash=" + encodeURIComponent("Calibration run complete — see the honest note"));
});

const port = Number(process.env.PORT ?? 8080);
// Loopback by default: the UI is unauthenticated and DB-writing, with no CSRF
// protection on its form posts. Set HOST explicitly to expose it.
const hostname = process.env.HOST ?? "127.0.0.1";
serve({ fetch: app.fetch, port, hostname }, (info) => {
  console.log(`triage web ui: http://${hostname}:${info.port}`);
});
