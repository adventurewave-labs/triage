# Golden set — construction methodology

**Defined ex ante, before any calibration results were computed.** Changing inclusion rules or labels after seeing results invalidates the eval; any such change must ship as a versioned diff with its rationale.

## Purpose

Back-score the golden companies with Triage's judgment layer and ask one question: **do high scores predict good outcomes?** The result ships as a visible calibration report — including where the system is wrong.

## Inclusion criteria

- Digital-health companies (care delivery, consumer health, digital therapeutics, health-tech infrastructure).
- Series A/B or equivalent announced **2019–2021** (public-data density for outcome tracking).
- US-headquartered or majority-US operations.

## Outcome labels (as of end-2024)

| Label | Definition |
|---|---|
| `up` | Subsequent round at higher valuation, IPO, or acquisition at ≥2× last valuation |
| `down` | Shutdown, bankruptcy, acqui-hire, major regulatory collapse, down round |
| `flat` | Continued operation without a clear up or down event; or documented stagnation |

## Label discipline

- Every label requires **two independent public sources**. Entries meeting the bar are `confirmed`; plausible-but-unverified entries are `candidates`.
- **Ambiguous cases are excluded, not forced.**
- The calibration report computes statistics over `confirmed` entries only, and reports `n` honestly.

## Honest statistics note

At n≈15–30, the confidence interval on Spearman ρ is wide. This eval is **directional**: the point demonstrated is that the harness exists, is honest, and is cheap to grow (labels come from public events). Growing `n` and upgrading `candidates` → `confirmed` is a documented path, not a hand-wave.

## Back-scoring packs

Each golden entry carries 3–5 **evidence summaries** (one-line public events with year-level sourcing). These assemble into the same evidence-pack shape the live system uses. Limitation, stated: starter summaries are single-author curated — weaker than live ingestion's provenance discipline. Upgrading summaries to cited events is part of growing the set.

## Contamination control

Golden companies are **never** eligible for the live briefing corpus: `seed/corpus.json` is checked against `golden-set.json` names at ingest time, and the exclusion list is hash-enforced (PRD §10, eval-contamination row).

## Known confounds (stated in advance)

- The heuristic stand-in provider (default, offline) is lexicon-based; it will read outcome-correlated language and therefore overstate calibration vs. a frontier judge. **This is a known limitation of the stand-in, not evidence about the frontier provider.** The report labels which provider produced the scores.
- Survivorship: `flat` labels are noisier than `up`/`down`.
