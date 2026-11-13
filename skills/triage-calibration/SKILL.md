---
name: triage-calibration
description: Run Triage's calibration eval — back-score the golden set, correlate with outcomes, produce the honest report. Use when the user asks whether the machine's judgment can be trusted.
---

# Triage: calibration report

```bash
pnpm calibrate       # full report (markdown)
pnpm eval            # quiet JSON headline (CI mode)
```

Methodology lives in `golden-set/methodology.md` — defined ex ante; changes ship as documented diffs. The report:
- computes Spearman ρ and lift **over confirmed entries only** (two-source labels);
- labels the provider (the lexicon stand-in's bias is documented, not hidden);
- carries the honest note: directional, wide CI — the demonstrated artifact is the harness's honesty, not a p-value.

Contamination control: golden companies are excluded from the live corpus at ingest (`assertNoContamination`), enforced in tests.
