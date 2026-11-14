/**
 * Server-rendered UI for Triage — zero build step, engine-direct.
 * Deliberate deviation from the PRD's Next.js sketch, documented in README:
 * the engine API is UI-agnostic, so the productionization path (Next.js)
 * stays open while the portfolio milestone ships a boring, working product.
 */

export function esc(s: unknown): string {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/**
 * Same-origin redirect target for form `back` fields. Only a single leading
 * "/" passes: "//host" and "/\host" are protocol-relative (browsers treat "\"
 * as "/"), and browsers strip tabs/newlines, so "/<TAB>/host" collapses to
 * "//host" — control characters are rejected outright.
 */
export function safeBack(back: unknown): string {
  return typeof back === "string" && /^\/(?![/\\])[^\x00-\x1f\x7f]*$/.test(back) ? back : "/";
}

const CSS = `
:root {
  --bg: #0b0f14; --panel: #121820; --panel2: #182028; --line: #223040;
  --text: #d7e0ea; --dim: #7d8ea0; --accent: #4cc2a9; --accent2: #6aa5f8;
  --warn: #e0a458; --bad: #e06c75; --good: #7ac38f;
}
* { box-sizing: border-box; }
body { background: var(--bg); color: var(--text); font: 14px/1.55 -apple-system, "Segoe UI", Roboto, sans-serif; margin: 0; }
a { color: var(--accent2); text-decoration: none; } a:hover { text-decoration: underline; }
.wrap { max-width: 1060px; margin: 0 auto; padding: 28px 20px 60px; }
header { display: flex; align-items: baseline; gap: 14px; border-bottom: 1px solid var(--line); padding-bottom: 14px; margin-bottom: 18px; }
header h1 { font-size: 20px; margin: 0; letter-spacing: 0.4px; }
header h1 span { color: var(--accent); }
header .meta { color: var(--dim); font-size: 12px; font-family: ui-monospace, monospace; }
header nav { margin-left: auto; font-size: 13px; }
.card { background: var(--panel); border: 1px solid var(--line); border-radius: 10px; padding: 16px 18px; margin-bottom: 14px; }
.card h2 { font-size: 16px; margin: 0 0 6px; display: flex; align-items: center; gap: 10px; }
.rank { color: var(--dim); font-family: ui-monospace, monospace; font-size: 13px; }
.badge { font-family: ui-monospace, monospace; font-size: 12px; padding: 2px 9px; border-radius: 999px; border: 1px solid var(--line); }
.score-high { color: var(--good); border-color: var(--good); }
.score-mid { color: var(--warn); border-color: var(--warn); }
.score-low { color: var(--dim); }
.conf { color: var(--dim); font-size: 12px; font-family: ui-monospace, monospace; }
.delta-up { color: var(--good); } .delta-down { color: var(--bad); }
.why { margin: 6px 0; padding-left: 18px; } .why li { margin: 3px 0; }
.bear { border-left: 3px solid var(--bad); padding: 6px 10px; margin: 8px 0; color: #e8b4ba; background: rgba(224,108,117,0.06); border-radius: 0 6px 6px 0; font-size: 13px; }
.dim-note { color: var(--dim); font-size: 12.5px; }
.declined { border-left: 3px solid var(--line); }
.declined .reason { font-family: ui-monospace, monospace; font-size: 11.5px; color: var(--warn); }
.evidence-id { font-family: ui-monospace, monospace; font-size: 11.5px; color: var(--accent2); background: var(--panel2); padding: 1px 6px; border-radius: 4px; }
.stale-tag { color: var(--warn); font-size: 11px; border: 1px solid var(--warn); border-radius: 4px; padding: 0 5px; }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
th { text-align: left; color: var(--dim); font-weight: 500; border-bottom: 1px solid var(--line); padding: 6px 8px; }
td { border-bottom: 1px solid var(--line); padding: 6px 8px; }
form.override { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-top: 10px; padding-top: 10px; border-top: 1px dashed var(--line); }
form.override select, form.override input[type=text] { background: var(--panel2); color: var(--text); border: 1px solid var(--line); border-radius: 6px; padding: 5px 8px; font-size: 12.5px; }
form.override input[type=text] { flex: 1; min-width: 180px; }
button { background: var(--panel2); color: var(--text); border: 1px solid var(--accent); border-radius: 6px; padding: 5px 12px; font-size: 12.5px; cursor: pointer; }
button:hover { background: rgba(76,194,169,0.12); }
button.agree { border-color: var(--good); } button.disagree { border-color: var(--bad); }
.flash { border: 1px solid var(--accent); background: rgba(76,194,169,0.08); color: var(--accent); border-radius: 8px; padding: 8px 12px; margin-bottom: 14px; font-size: 13px; }
.warm { background: rgba(106,165,248,0.07); border: 1px solid rgba(106,165,248,0.35); border-radius: 8px; padding: 8px 12px; margin: 8px 0; font-size: 13px; }
.runbtn { float: right; }
.dimline { margin: 10px 0 14px; padding-bottom: 10px; border-bottom: 1px dashed var(--line); }
.dimline:last-child { border-bottom: none; }
.dimline .head { display: flex; gap: 10px; align-items: baseline; }
.dim-score { font-family: ui-monospace, monospace; color: var(--accent); }
.small { font-size: 12px; color: var(--dim); }
.footer { margin-top: 34px; color: var(--dim); font-size: 12px; border-top: 1px solid var(--line); padding-top: 14px; }
`;

export function layout(title: string, body: string, active?: "brief" | "calibration"): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} — Triage</title>
<style>${CSS}</style>
</head>
<body><div class="wrap">
<header>
  <h1><span>▸</span> TRIAGE</h1>
  <span class="meta">evidence-linked first pass · arguing with it is the feature</span>
  <nav>
    <a href="/" ${active === "brief" ? 'style="color:var(--accent)"' : ""}>Briefing</a>
    &nbsp;·&nbsp;
    <a href="/calibration" ${active === "calibration" ? 'style="color:var(--accent)"' : ""}>Calibration</a>
  </nav>
</header>
${body}
<div class="footer">
  Every claim cites evidence pack item IDs (hard gate, FR-8) · scores record rubric version + provider + pack hash (replayable) · declined section = recall safety net, nothing silently dropped
</div>
</div></body></html>`;
}

export function scoreBadge(score: number): string {
  const cls = score >= 2.5 ? "score-high" : score >= 1.5 ? "score-mid" : "score-low";
  return `<span class="badge ${cls}">${score.toFixed(2)} / 4</span>`;
}

export function deltaHtml(delta: number | null): string {
  if (delta === null) return "";
  const sign = delta >= 0 ? "+" : "";
  const cls = delta > 0 ? "delta-up" : delta < 0 ? "delta-down" : "";
  return `<span class="${cls} small">Δ ${sign}${delta.toFixed(2)} vs last week</span>`;
}
