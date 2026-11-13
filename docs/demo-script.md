# Demo runbook — 5 minutes, follows PRD §15

Every command runs from the repo root. The demo uses the watermarked synthetic corpus by default — **say "synthetic, swappable" out loud** (the demo script requires it; honesty is the positioning).

**Setup (before the room):**
```bash
pnpm install
pnpm seed
pnpm brief
pnpm web        # in a second terminal — http://127.0.0.1:8080
```

Fallback: pre-recorded video + screenshots. No live-demo heroics.

---

**Beat 1 — Hook (30s).** Browser on `http://127.0.0.1:8080`:

> "These are the ten things the firm should look at this week — and the ones it shouldn't, with reasons. This is the systematic channel: the companies your network hasn't reached yet."

Point at: ranked cards, why-now drivers, bear cases, and the **Declined** section at the bottom ("nothing silently dropped — insufficient data is a *flag*, not a black hole").

**Beat 2 — Drill (90s).** Click **#1 Corvia Care**:

- **Warm path**: "F. Doyle → M. Alvarez → Corvia Care" — "two taps, we know who can vouch."
- Signal timeline with per-row sources; graph neighborhood; scorecard where **every dimension cites evidence item IDs** — and the honest zero-floors ("below rubric minimum" is displayed, not hidden).

**Beat 3 — Judgment (60s).** On the dossier:

- Point at the bear case: "that's the output of a red-team pass that attacks the draft — not a genre convention."
- Then the rubric-as-artifact: `git diff` nothing needed — say it: "the rubric is versioned in git; when scores move, we can attribute it to data vs. rubric."
- Tap **Disagree** → reason code `wrong_weight` → note "clearance ≠ reimbursement" → save. "Ten seconds. That override just became an eval case."

**Beat 4 — Proof (60s).** Click **Calibration**:

> "Back-scored against 30 real digital-health outcomes. Spearman ρ on the 13 two-source-confirmed entries — and look at the note at the bottom: it says where it's wrong and what the known confounds are. The harness is the artifact; the honesty is deliberate."

**Beat 5 — Agentic surface (60s).** Terminal with Claude Code in this repo (MCP config in `.mcp.json`):

```
> brief me on Corvia Care        # calls triage_dossier MCP tool
> what's ranked this week        # calls triage_brief
```

> "Same intelligence, two surfaces — a product for the partners, tools for agents."

**Beat 6 — War story (30s).** Close with the entity-merge story (`docs/war-stories.md`):

> "The scariest failure in this system is a wrong entity merge — it would silently inflate a founder's track record. So resolution is deterministic-first with a human review queue: wrong splits are cheap, wrong merges poison scores. The system is designed around its own worst failure mode."

---

## Full CLI backup (if the browser misbehaves)

```bash
pnpm brief                     # ranked briefing (markdown)
pnpm dossier --name "Corvia Care"
pnpm memo --name "Corvia Care"
pnpm calibrate                 # calibration report
pnpm ingest --live             # real ClinicalTrials.gov + openFDA signals
pnpm test                      # 25+ tests, offline
```
