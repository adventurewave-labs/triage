---
name: triage-score
description: Run Triage's judgment layer on one company or founder — evidence pack, citation-gated scoring, red-team pass. Use when the user wants a company scored or re-scored.
---

# Triage: scorecard

```bash
pnpm score --name "Corvia Care"     # JSON scorecard
pnpm memo --name "Corvia Care"      # IC memo draft (requires a prior score)
```

The loop (PRD §8.2): retrieve evidence pack → draft score → **citation gate** (hard: refs must resolve, ≥2 per nonzero dimension) → red-team pass (fresh context attacks the draft) → adjudication (sustained challenges reduce scores and become the bear case) → persist with `(rubric_version, provider, pack_hash)` for replay.

Generate the IC memo with the required Unknowns and What-would-change-my-mind sections from any persisted scorecard.
