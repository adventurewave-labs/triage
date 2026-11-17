# Changelog

## v0.1.0 — 2026-11-17

First public release: **evidence-linked decision support for early-stage healthcare investing** — public signals → entity graph → red-teamed, calibrated weekly briefing.

### Product surface

- **Judgment engine** — versioned rubric (`rubric/v0`), hash-stable evidence packs, hard citation gate (a scorecard whose claims don't resolve to evidence does not ship), adversarial red-team pass that produces the bear case, calibration against a 30-entry golden set of real digital-health outcomes (Spearman ρ reported with honest notes on confounds)
- **Web app** — weekly briefing (ranked cards + declined section: nothing silently dropped), company dossier (signal timeline, graph neighborhood, warm paths, per-dimension evidence IDs), the ≤10-second one-tap override loop with a reason-code taxonomy, calibration screen
- **Agentic surface** — MCP server (6 tools) + 4 Claude Code skills; the same intelligence is a tool for agents
- **Data** — watermarked synthetic demo corpus (`sim:` prefixes; swappable CRM adapter per FR-9) + live ClinicalTrials.gov and openFDA adapters producing citable URLs
- **CLI** — `seed · brief · dossier · memo · score · calibrate · ingest --live · mcp · web`

### Verification record (this release was earned, not asserted)

**48 consecutive green checks across three environments:**

- **8/8 clean-room validations** (fresh Codespace clone, every 15 min × 2h)
- **20/20 production soak** (5h long-lived server: zero memory drift, warm latencies 13–23ms, 4 platform idle-suspend kills — all self-healed within one tick)
- **20/20 live-deployment monitoring** (public URL from the open internet: medians 394/283/393ms, zero application failures, zero restarts)

### Issues found and fixed on the road

vitest cold-boot config race · `curl | grep` SIGPIPE false negatives under `pipefail` (exit 23) · pnpm 9/12 workspace-file drift (twice — CI and Railway, closed by `packageManager` pin) · Codespace git-credential loss on suspend · Railpack start-script convention (deprecated `railway.json` → `start` script + `.railway/railway.ts` IaC) · macOS/GNU `date` portability in the check scripts

### Pull requests in this release

#1 CI toolchain match · #2 web UI milestone (briefing, dossier, override loop, calibration) · #3 demo assets + outreach kit · #4 validation & soak harness · #5 Railway deployment · #6 release packaging (this)

### Known limits (documented, by design)

Demo corpus is synthetic and watermarked; the default judge is a deterministic lexicon stand-in (frontier provider via `TRIAGE_PROVIDER=anthropic`); the store is single-process PGlite (sequential boot; ephemeral per deploy on single-service hosting); no auth — the server binds loopback unless `HOST` is set explicitly. See `docs/PRD.md` §14 for the full productionization path.
