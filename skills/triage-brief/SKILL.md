---
name: triage-brief
description: Generate Triage's ranked weekly briefing — scored, evidence-linked, with the declined section. Use when the user asks what to look at this week or wants the deal pipeline triaged.
---

# Triage: weekly briefing

Run the briefing pipeline against the local store:

```bash
pnpm brief
```

What you get:
- Ranked ≤10 companies, each with score, derived confidence, why-now drivers (≤120 days), delta vs the previous run, a bear case produced by the red-team pass, and evidence counts.
- A **declined section** — what was considered and rejected, with machine-readable reasons (`below_rank_line`, `insufficient_data`). Nothing is silently dropped.

Rules of engagement:
- Every score cites evidence pack item IDs; the citation gate is hard (FR-8).
- The provider is labeled. Default is the deterministic `mock-lexicon-v0` judge (offline, CI-safe). With `TRIAGE_PROVIDER=anthropic` and a key set, the frontier judge runs.
- Reproduce any score via the contract: `(rubric_version, provider, pack_hash)` — see `src/engine/score.ts` and PRD §8.3.
