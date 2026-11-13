---
name: triage-dossier
description: Pull Triage's full dossier for a company — signal timeline, graph neighborhood, warm path, scorecard. Use when the user asks about a specific company on the pipeline.
---

# Triage: company dossier

```bash
pnpm dossier --name "Corvia Care"
```

The dossier view contains:
1. **Signal timeline** (newest first, stale flagged per type window).
2. **Graph neighborhood** (≤2 hops) — people, investors, adjacent companies.
3. **Warm path** — shortest relationship path from the firm's network roots (CRM layer; `sim:`-watermarked in the portfolio build).
4. **Latest scorecard** — per-dimension scores with evidence item IDs and counter-evidence, plus the bear case.

MCP equivalent: `triage_dossier` / `triage_warm_path` tools.
