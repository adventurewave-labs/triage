# PRD — Triage
**Turn scattered signals into a ranked, evidence-linked deal pipeline — before the human IC ever convenes.**

*Portfolio project targeting the Senior Director, Applied AI role at Redesign Health. Solo build, 4 weeks, demoable in 5 minutes. Version 0.4.*

---

## TL;DR

Early-stage healthcare investing has a **first-pass problem**: partners see hundreds of signals a quarter, the IC only sees what associates had time to escalate, and nobody can audit why anything died in the pile. Existing tools either store relationships (Affinity), sell data (PitchBook), or accelerate research (Tegus). **None of them manufacture an auditable first-pass judgment tuned to the firm's own rubric.**

Triage is that system. It ingests public signals, resolves them into an entity graph, and produces a weekly ranked briefing where **every score is traceable to evidence, survives an adversarial red-team pass, carries a confidence and a bear case, and is calibrated against known historical outcomes**. It ships twice: as a web app for the investment team, and as an MCP server + Claude Code skills so the same intelligence is a tool for agents.

The product enforces the floor — structure, citations, coverage. Humans own the last mile. That is the division of labor the JD describes; it is also the product's design principle.

---

## 1. Problem

### 1.1 The shape of the problem

Early-stage investing does not have a sourcing-volume problem. It has an **attention-allocation and conviction-formation** problem:

- Signal exposure (inbound intros, funding events, clinical/regulatory developments, key hires) vastly exceeds deep-research capacity. The escalation step is the bottleneck — and it is opaque.
- Nobody can audit why a company died in the pile. The firm's collective judgment about *what mattered* lives in email threads and heads, not in a system that learns.
- Tooling is split: CRMs track relationships but generate no judgment. Data terminals sell facts but no ranked point of view. Neither encodes *the firm's* rubric, and neither is accountable for being right.

**Why the escalation step bloats.** The incentive gradient for an associate points one way: escalating a dud costs little (blame is diffuse), while killing a winner is career-defining. So escalation volume inflates, IC hours get consumed by defensive escalations, and the pile everyone complains about is the rational output of the incentive structure — not a discipline failure. A first-pass system doesn't ask people to work harder; it re-prices the decision to look.

**The relationship channel is not the competitor.** A partner's best deals arrive through trusted humans, and they always will. Triage is the **systematic channel**: coverage of the companies no warm path has reached yet. Nobody is asked to trust the machine over their network — they're asked to skim the machine's coverage of what the network hasn't touched.

### 1.2 Working assumptions (stated so they can be attacked)

For a healthcare-focused early-stage fund (3 investing partners, 2 associates), assume:

| Quantity | Assumption | Basis |
|---|---|---|
| Inbound intros | ~40/month | Typical partner volume, early-stage healthcare |
| Monitored signal events | ~60/month | New trials, FDA filings, key hires at tracked companies |
| Deep research capacity | 8–12 companies/month | 2 associates, ~3–4 hrs/company |
| IC meeting time | ~2 hrs/week, ~6 companies | Fixed governance cost |

⇒ **Roughly 70–80% of signal exposure receives zero deep look**, and 100% of the reasoning about what got skipped is unrecorded.

**External anchor:** Stanford GSB research puts the funnel at **101 companies reviewed per investment made** — the estimates above are conservative against the published number ([field-evidence.md](./field-evidence.md), Q2).

If these are off by 2×, the conclusion doesn't change: the binding constraint is attention, not data. That is a claim about where leverage lives, and the whole product bets on it.

### 1.3 Problem statement

> Given a stream of public signals and the firm's relationship history, produce a weekly ranked pipeline in which every ranking is traceable to evidence, carries stated confidence and counterargument, and measurably improves against known outcomes over time.

---

## 2. Prior art, and why it loses here

| Product | What it does | Why it doesn't solve this |
|---|---|---|
| Affinity | Relationship intelligence CRM | Stores who-knows-whom; generates no ranked judgment, no evidence discipline, no calibration. Adoption is the industry's acknowledged failure mode — median spend ~$62k/yr, and "the Affinity-vs-Attio war is a distraction from the adoption war" ([field-evidence.md](./field-evidence.md), Q4) |
| DealCloud / 4Degrees | Deal workflow management | Pipeline bookkeeping; tracks deals, doesn't synthesize signals into a point of view |
| PitchBook / CB Insights | Data terminals | Rich facts, human-curated categories; expensive, generic — encodes no firm-specific rubric, accountable to no outcome |
| Harmonic.ai | Graph-based company discovery | Closest in shape; but no evidence-linked scorecards, no bear cases, no rubric versioning, not outcome-calibrated, not healthcare-specialized |
| Tegus / AlphaSense | Expert-call & document search | Accelerates research that is *already in scope*; does nothing for the triage layer above it |
| Redesign's virtual IC (internal) | End-to-end analysis of deals in play | **Downstream of us.** Triage decides what deserves to be in play, and feeds it. Complementary, not competitive |

### 2.1 The null hypothesis: "why not just use Claude Code?"

The real competitor in 2026 isn't a vendor — it's a partner with an agent, a PitchBook export, and a free afternoon. That path is fast, flexible, and requires zero infra. It also:

- **Evaporates.** No corpus, no graph, no eval suite, no memory of yesterday's judgment. When the afternoon ends, the capability ends with it.
- **Can't be held accountable.** An unversioned prompt that produced a good call last quarter can't be diffed, replayed, or calibrated against outcomes.
- **Doesn't compound.** Ten ad-hoc runs teach the firm nothing about its own judgment.

The distinction worth saying out loud: **ad-hoc agents produce analyses; Triage produces an institution** — the versioned rubric, the evidence standard, and the calibration survive the individuals. (The agent isn't excluded, though: §12 is exactly that partner's session, wired into the institution.)

**Why this is buildable now:** schema-constrained outputs made citation gates enforceable rather than aspirational; MCP made the agentic surface a standard instead of a custom integration; tiered model pricing made per-company judgment affordable. Two years ago this was a platform team's year of work. Now it's four weeks.

---

## 3. Users & jobs-to-be-done

| User | Job | Today | With Triage |
|---|---|---|---|
| Partner | "What should I actually look at this week, and why?" | Associate escalations + gut + email | Weekly briefing: ranked 10 with why-now cards; plus a **declined** section showing what the system rejected and why |
| Associate | "Prep this company for IC" | 4–6 hours of manual research | 1-click dossier + memo draft that cites every claim |
| Partner | "Do we know anyone who can vouch for this founder?" | Memory, CRM spelunking | Warm-path: graph search across co-founders, co-investors, operators |
| Applied AI team | "Can we trust the machine's first pass?" | — | Calibration report, faithfulness evals, override loop, CI-run regression suite |

The partner jobs above were derived from the JD's own list of embedded functions and grounded in public operator accounts and benchmark data — cited in [field-evidence.md](./field-evidence.md) — before any code. 2–3 private conversations with early-stage investors and one deal-platform operator are scheduled to validate what public sources can't, and those notes ship with the repo as a build artifact. The distinction matters: a JTBD table that says "derived from a job description" is a hypothesis; one with named citations and interview counts is field evidence.

---

## 4. The three pillars

The firm's stated formula is **data + relationships + judgment to predict the future**. The product is structured so each pillar is a legible subsystem:

1. **Data → Signal layer.** Public events: funding rounds, ClinicalTrials.gov submissions, FDA device filings (openFDA), PubMed publications, patent grants, executive hires (public job-board changes), company-site changes.
2. **Relationships → Entity graph.** Entity-resolved graph of companies, people, investors, care areas. Edge types: co-founder, prior employer, board, co-investment, authorship, inventorship. Powers warm-path discovery and founder track-record assembly.
3. **Judgment → Scored judgment layer.** A versioned rubric (§6) executed by LLM agents over evidence packs — with an adversarial red-team pass on every score (§8.2). Every score carries citations, a bear case, confidence, and a rubric version. Human overrides are first-class objects that become eval cases (§9.3).

---

## 5. Product surface

Four screens. Every claim shown anywhere resolves to a stored source snippet — this is a hard generation gate (FR-8), not a UI convention.

### 5.1 Weekly Briefing
Ranked list of ~10 companies/concepts + a declined section. Per card: score, confidence, why-now line (the triggering signal), delta vs. last week, evidence count, bear case one-liner.

Example card (names fictional):

```json
{
  "rank": 1,
  "company": "Corvia Care — home-based post-acute cardiology",
  "score": 3.4, "confidence": 0.72,
  "why_now": [
    "FDA 510(k) clearance for remote cardiac monitor, granted 2025-10-14 (openFDA K253417)",
    "VP Clinical Ops hired from a shut-down digital-therapeutics company, 2025-10-28 (public job-board + company post)",
    "CMS 2026 physician-fee-schedule proposed rule adds remote therapeutic monitoring codes (final pending)"
  ],
  "delta": "+0.6 vs last week (driver: clearance)",
  "bear_case": "Revenue model leans on chronic-care-management billing that auditors increasingly claw back; 2 of 3 listed signals are people/regulatory, not traction.",
  "evidence_count": 7, "first_seen": "2025-09-02"
}
```

**Declined section** (the auditability flex): what was considered and rejected, with reasons. Companies with insufficient evidence appear here with reason `"insufficient_data"` — never silently dropped.

### 5.2 Company Dossier
Signal timeline, graph neighborhood (≤2 hops, top ~12 nodes), scorecard with per-dimension citations, bear case — including what the red-team pass found (§8.2). Interactive, p50 < 45s with cached evidence packs.

### 5.3 Founder Scorecard
Track record assembled from the graph: prior companies and outcomes (role-weighted: founder ≠ early employee), co-founder network, domain depth via publications/patents. **Discrepancies are flagged, not hidden** — conflicting sources become a visible row, which is itself a trust signal.

### 5.4 IC Memo Generator
One-click memo in the firm's format: inline citations, plus two required sections — **Unknowns** and **What would change my mind**.

Memo excerpt:

```
Unknowns
- Whether the VP Clinical Ops hire has started. Greenhouse posting pulled, but
  sources conflict: company post says "joined" (2025-10-28); a recruiter post
  (2025-11-03) says "still advising." Unresolved.

What would change my mind
- CCM claw-back enforcement actions against two comparators in Q1 2026.
- The clinical ops hire falls through before Series A close.
```

### 5.5 Functional requirements

| ID | Requirement | Acceptance |
|---|---|---|
| FR-1 | Scheduled weekly run produces briefing: ≤10 ranked cards + declined section | Every card: why-now, ≥2 evidence links, bear case, confidence. Run ≤30 min wall clock |
| FR-2 | Dossier view per company | Timeline + neighborhood + scorecard; all claims click through to evidence; p50 <45s cached |
| FR-3 | Founder scorecard from graph, role-weighted | Prior-outcome attribution distinguishes founder vs. employee; discrepancies flagged visibly |
| FR-4 | Memo generator | Citations inline; Unknowns and What-would-change-my-mind sections present; draft in <3 min |
| FR-5 | Override annotations | Partner verdict + reason code (taxonomy §9.3) + optional evidence refs; stored as eval-able objects |
| FR-6 | Declined section | ≥90% of rejected companies appear with a machine-readable reason; `insufficient_data` is a valid reason |
| FR-7 | Freshness discipline | Every signal carries age; per-type staleness windows; stale signals excluded or flagged |
| FR-8 | Citation integrity hard gate | Any claim without a resolvable evidence ref **fails generation** — the card doesn't ship (enforcement mechanism: §8.2) |
| FR-9 | Firm-CRM swap-in adapter | Synthetic CRM layer implements the same interface as a real CRM adapter; swap is config, not code |

### 5.6 The loop in one trace

One signal, end to end. Day 0: openFDA publishes a 510(k) clearance (K253417) for Corvia Care's monitor.

1. **Ingest** — adapter normalizes: `Signal(type=regulatory_clearance, entities=[Corvia Care], source=openFDA, age=0d)`.
2. **Resolve** — clearance entity-matches the known company; merge confidence 0.97, review queue not triggered.
3. **Sunday run** — evidence pack assembles (7 signals, clearance verbatim with K-number). Draft score: 3.1. **Red-team pass** finds the draft overstated a trial as "Phase II completion" when it was Phase I — the momentum claim's evidence is corrected. Final: 3.4, confidence 0.72, bear case = the challenge that survived.
4. **Briefing** — rank #1, delta +0.6, why-now = the K-number.
5. **Partner** — opens dossier, clicks through to openFDA, overrides the regulatory-posture dimension with reason `wrong_weight`: "clearance ≠ reimbursement — needs CMS final rule."
6. **Learning** — the override becomes an eval case; a rubric change proposal is drafted: *"regulatory posture should require reimbursement-pathway evidence, not clearance alone."* Next week's rubric diff references it.

Signal → score → argument → override → rubric diff. That is the whole product in six lines, and every arrow is auditable.

---

## 6. The rubric (v0) — judgment as a versioned artifact

The rubric lives in the repo as markdown + structured weights, diffable in git. Every score records `rubric_version`. When scores move between runs, we can attribute the movement to **data vs. rubric** — that attribution is the product's core trust mechanism.

Each dimension: 0–4 scale with written anchors, a weight, a minimum independent-evidence count (≥2), and required consideration of counter-evidence. **Confidence is a derived field** from evidence volume, source agreement, and recency — not vibes.

### 6.1 Company / concept rubric (weights sum to 100)

| Dimension | Wt | What it measures |
|---|---|---|
| Why-now strength | 25 | What changed in the last 12 months: cost curves, regulation, reimbursement, behavior. A company with no recent change is a *background* company |
| Market structure | 15 | Fragmentation, incumbent failure modes, credible reimbursement pathway |
| Wedge defensibility | 15 | Data/network/regulatory moat plausibly reachable from the entry wedge |
| Regulatory & reimbursement posture | 15 | Clearance pathway clarity; tailwind vs. headwind |
| Capital efficiency path | 15 | Are the milestones to the next raise credible at this burn? |
| Signal momentum | 15 | Hiring, trial activity, filing cadence trending up vs. flat |

### 6.2 Founder rubric (weights sum to 100)

| Dimension | Wt | What it measures |
|---|---|---|
| Domain depth | 20 | Years *in the specific care domain*; clinical/operational credibility (roles, publications, patents) |
| Outcome quality | 20 | Prior company outcomes, **role-weighted** (founder vs. early employee at outcome) |
| Insight specificity | 20 | Does the founder articulate a falsifiable, non-consensus claim tied to their operating history? |
| Co-founder complementarity | 15 | Coverage of clinical + engineering + GTM |
| Recruiting magnetism | 15 | Evidence of attracting strong operators early |
| Signal integrity | 10 | Consistency of public narrative vs. track record; discrepancies flagged |

Example scored dimension:

```
dimension: insight_specificity        weight: 20    score: 3/4
anchor 3: founder articulates a specific, falsifiable claim tied to their operating history
evidence:
  E1 — founder, HLTH 2024 panel: "post-discharge readmission is a pricing
       problem, not a monitoring problem" [source url]
  E2 — prior company's published pilot result tests the pricing mechanism
       across 14 sites [source url]
counter_evidence:
  C1 — same claim made in a 2022 talk with no published result since [source url]
```

### 6.3 Why put the rubric in the PRD

Because encoding judgment *is* the job. A candidate who can show a rubric with anchors, weights, counter-evidence requirements, and a versioning story is showing the exact muscle the firm says AI can't replace — taste on the last mile, made explicit and improvable.

### 6.4 Error asymmetry (tuning rule)

The two errors a first-pass system can make cost very different amounts:

- **False positive** (ranked #3 but weak): ~30 minutes of a partner's time. Annoying, recoverable, *visible* — and the override loop converts it into training signal.
- **False negative** (the winner never shown): invisible, unrecoverable, compounding. The firm never learns what it didn't see.

Therefore the ranked-10 is tuned for **recall at the evidence bar**: a company with strong evidence but noisy signals belongs in the briefing with low confidence and a loud bear case; a company with thin evidence belongs in **declined** with `insufficient_data` — never silently dropped (FR-6). The declined section is not a trash bin; it is where false negatives are quarantined for human audit. Design rule: **every rejection must be reconstructable.**

---

## 7. Data & schema

### 7.1 Sources (MVP corpus: ~150 companies, ~400 people, ~2,000 signals; digital health / healthcare services only)

| Source | What it yields | Access |
|---|---|---|
| ClinicalTrials.gov API v2 | Trial starts/phases per sponsor → activity signals | Free, public domain |
| openFDA (510(k), PMA, recalls) | Device/drug regulatory events | Free, public |
| SEC EDGAR full-text search | Filings, S-1s, 8-Ks for later-stage targets | Free, public |
| PubMed | Founder/CMO authorship → domain depth | Free, public |
| PatentsView | Inventorship edges, IP posture | Free, public |
| Public job boards (Greenhouse/Lever) | Hiring signals; postings appear/disappear | Free, **public postings only**, ToS-respecting |
| Firm CRM layer | Relationships | **Synthetic in portfolio version**, watermarked (`sim:` edge prefix), behind FR-9 adapter |

### 7.2 Entity model (compact)

```
Entity      company | person | investor | care_area
Signal      id, type, source_url, fetched_at, raw_ref, entities[], age
Edge        type (co-founder|prior_employer|board|co-investment|authorship|inventorship|sim:*),
            from, to, evidence_ref, merge_confidence, provenance
Score       rubric_version, subject, dims[], confidence, bear_case, run_id, pack_hash
Override    score_id, partner, verdict, reason_code, evidence_refs[]
Vector idx  signal text + entity cards (pgvector) for semantic retrieval
```

Entity resolution: deterministic matchers first (name + domain + registry IDs), then embedding-assisted candidates above a merge-confidence threshold; anything below threshold goes to a human-review queue rather than auto-merging. Rationale in §18: wrong merges poison scores silently; wrong *splits* are cheap and visible — so the queue is a product feature, not an afterthought.

---

## 8. Context & agent architecture

The JD names context engineering explicitly. Here is the design.

### 8.1 Evidence pack (per company, ~12k token budget)

| Component | Form | Budget | Order |
|---|---|---|---|
| Rubric vN | verbatim | ~1k | 1st — primes the judgment frame |
| Entity card | verbatim | ~1.5k | 2nd |
| Top-k signals (recency × relevance ranked) | verbatim, k≤20 | ~6k | 3rd, newest first |
| Graph neighborhood summary | precomputed, ≤2 hops | ~1.5k | 4th |
| Instructions + output schema | verbatim | ~1k | last |

Packs are cached, versioned (`pack_hash`), and **never silently regenerated** between a briefing and its dossier — the evidence a partner reads is the evidence the score saw.

### 8.2 Scoring loop — four calls, not one

1. **Retrieve** → evidence pack (deterministic, cached).
2. **Draft score** → schema-constrained output. The output schema *requires* every dimension's `evidence[]` to reference pack item IDs; a validator rejects any ref that doesn't resolve, and any dimension with fewer than 2 refs. Invalid output is retried once, then the card **fails** (FR-8). The model never gets a chance to emit an uncited claim that survives.
3. **Red-team pass** → a fresh-context agent *attacks* the draft: find claims whose evidence doesn't support them; find a stronger bear case than the drafted one; find the disqualifying fact the draft ignored. Challenges carry their own evidence refs and are adjudicated in step 4. **Fresh context, not self-critique** — same-context review inherits the draft's frame (rationale: §18).
4. **Final score** → resolves challenges; unresolved ones surface in the bear case verbatim. If the red-teamer finds nothing, the bear case reads *"red-team pass found no surviving counterargument at evidence bar X"* — which is itself information.

The bear case stops being a genre convention the model pads and becomes the **output of an adversarial step**. That single design choice is what separates this from a prompt template.

### 8.3 Reproducibility contract

A score row is replayable given `(rubric_version, model pin, corpus snapshot hash, pack_hash)`. Rankings may vary slightly across runs — measured and reported (§9.1) — but the *evidence* cannot change silently. Anyone can re-run any historical score and see what the system knew at that moment.

---

## 9. Eval harness — the differentiator

This is where the project stops being a CRUD app and becomes a statement about machine judgment.

### 9.1 The four evals

| Eval | Question | Method | Gate |
|---|---|---|---|
| Retrieval | Does scoring pull the *right* evidence? | recall@k / MRR on hand-labeled evidence sets for ~20 companies | regression suite, CI |
| Faithfulness | Does every claim entail its cited evidence? | LLM-as-judge on claim→snippet entailment; **hard gate** | generation fails on violation |
| Stability | Do rankings hold across runs/seeds? | Re-score sample twice per release; rank-correlation reported | report, no hard gate |
| Calibration | Do high scores predict good outcomes? | Back-score golden set; Spearman ρ + lift table | shipped artifact |

### 9.2 Golden set — construction methodology (defined ex ante, before looking at any results)

- **Inclusion:** digital-health companies, Series A/B announced 2019–2021, ≥$10M raised, US-based (public-data density).
- **Outcome labels** as of end-2024: *up* (subsequent round at higher valuation, or acquisition ≥2× last valuation), *down* (shutdown, acqui-hire, down round), *flat/unknown* (no detectable activity).
- Every label confirmed by **two independent public sources**; ambiguous cases are **excluded, not forced**.
- n ≈ 30. **Honest stats note:** at n=30 the confidence interval on ρ is wide. This eval is directional — the point being demonstrated is that the harness *exists, is honest, and is cheap to grow*, not that we've published a p-value. Growing n is a documented path, not a hand-wave.

### 9.3 Override loop = the system's memory

Partners annotate agree/disagree with a reason code:

`missing_evidence | wrong_weight | stale_data | entity_error | model_error | judgment_differs`

- Overrides are first-class objects (schema §7.2) and flow into the eval suite as new cases.
- Recurring disagreement patterns generate **rubric change proposals** — the rubric improves through documented diffs, not silent retuning.
- **Anti-sycophancy guard:** we monitor whether post-override scores drift toward partner priors *without new evidence*. If they do, that's a detected failure mode (§10), not a feature.
- **Annotation compliance is the real failure mode.** Partners will not fill in forms. An override must be expressible in **≤10 seconds, in-flow** — one tap on the card, one reason code, optional note — or it won't happen at all. When it doesn't, the system falls back to passive signals: briefing opens, dossier dwell time, memo starts, and which ranked cards drift silently toward the declined pile. Silence is data too, and the product is designed to learn from it.

---

## 10. Production failure modes (what breaks, and how we'll know)

The JD asks for people who've "dealt with what breaks when models sit in front of real users." This table is that answer, designed in advance:

| Failure mode | Detection | Mitigation |
|---|---|---|
| Wrong entity merge (inflates a founder's track record) | merge-confidence threshold; spot-check queue on sample merges | human-review queue; §15 war story is exactly this |
| Stale signal (event already acted on) | signal `age` field; per-type staleness windows | briefing flags or excludes stale drivers |
| Source drift (API schema change) | adapter contract tests in CI; per-source last-success timestamps | alert + fail closed (no silent empty ingest) |
| Model/prompt drift across versions | snapshot eval suite re-run per model change; pin + regression gate | diff report before any model bump |
| Score inflation / rubric gaming | score-distribution monitoring (mean drift between runs) | weights change only via documented rubric diffs |
| Override sycophancy | post-override score drift vs. evidence presence (§9.3) | overrides require evidence-linked reason codes |
| Eval contamination (golden-set companies leak into corpus) | hash-based exclusion list at ingest | golden companies never eligible for live briefing |
| Silent data decay | freshness dashboard: per-source success rate, age histogram | weekly ops glance; sources failing 2 consecutive runs are quarantined |

A short **war-stories doc** ships with the repo: each row that fired during the build, what it corrupted, how it was caught. That doc is an interview artifact, not documentation.

---

## 11. Ops budget (operational maturity is part of the demo)

- **Cost targets** (tiered models: cheap for extraction/normalization, frontier for judgment): scoring one company ≈ 8–15k tokens in / 1.5k out ⇒ **<$0.50/company**; weekly briefing run **<$75**; on-demand dossier **<$3**; memo **<$2**.
- **Latency:** briefing is a batch run (Sunday night); dossier p50 <45s warm; memo <3 min. Streaming everywhere a human waits.
- **Determinism posture:** evidence packs are cached and versioned (§8.3); re-scoring the same pack may vary (reported, §9.1), but the *evidence* never silently changes between a briefing and its dossier.

---

## 12. Agentic surface (non-negotiable #2, answered structurally)

The same intelligence ships two ways on purpose:

- **MCP server** exposing: graph queries (warm-path, neighborhood), semantic signal search, scorecard generation, calibration report. Any Claude Code session can use the firm's intelligence as a tool.
- **Skills:** `/triage:brief`, `/triage:dossier <company>`, `/triage:score <founder>`, `/triage:calibration`.
- **Evals in CI:** `pnpm eval` → report artifact on every PR; retrieval regression blocks merge.

The demo line: *"The intelligence isn't trapped in a website. It's a tool for agents — which is how the firm's own workflows will consume it."*

---

## 13. Data ethics & sourcing posture (stated because judgment includes this)

- Only public-domain or public-API sources in the automated pipeline (§7.1). Public job postings only; no login-walled scraping; no LinkedIn scraping — public, indexable signals only.
- The synthetic CRM layer is **watermarked** (`sim:` edge prefix) and swappable (FR-9) — the demo never passes synthetic data off as proprietary.
- No PHI anywhere in the system. No secrets in prompts. Per-signal provenance metadata records source URL + fetch hash, so any claim is auditable to its fetch.
- Posture in one line: **if we wouldn't cite it in an IC memo, we don't ingest it.**

---

## 14. Scope

### 14.1 MVP in (4 weeks, solo)
One domain (digital health / healthcare services); 2–3 live free sources + synthetic CRM behind an adapter; the 4 screens; rubric v0 + eval harness + calibration report; MCP server + skills; CI evals.

### 14.2 Out (cut without ceremony)
Ingestion at scale (curate the seed corpus; automate one scheduled job on one source to prove the pattern). Additional sectors/geographies. Autonomous decisions — the system proposes and cites; humans decide. Talent wedge (§17). Concept/theme generation (§17).

### 14.3 Two-week cut line
Weekly Briefing + Company Dossier + one calibration eval shipped. Cut: memo generator, patent source, skills surface. The calibration report is never on the cut list — it's the thesis.

### 14.4 Milestones

| Week | Deliverable | Definition of done |
|---|---|---|
| 1 | Seed corpus + entity graph | 150 cos / 400 people resolved; ≥90% merge accuracy on a 50-entity spot check; every signal traceable to source URL; review queue live |
| 2 | Scoring + Briefing + Dossier | FR-1/2/6/7/8 green; bear case on 100% of cards; declined section populated |
| 3 | Evals + calibration + MCP/skills | Golden-set methodology doc (ex-ante) + calibration report shipped honestly; `pnpm eval` green in CI; a Claude Code session produces a dossier via MCP |
| 4 | Memo generator + demo polish | 5-min demo runs end-to-end unedited; war-stories doc written; FR-4/5 green |

---

## 15. Demo script (5 minutes)

1. **Hook (30s):** open on the Weekly Briefing. "These are the ten things the firm should look at this week — and the twenty it shouldn't, with reasons. This is the systematic channel: the companies your network hasn't reached yet."
2. **Drill (90s):** one dossier: signal timeline → graph neighborhood → warm path ("two portfolio CMOs previously worked with this founder"). Click through two claims to source.
3. **Judgment (60s):** scorecard with bear case + confidence; then `git diff` the rubric between two versions — "when scores move, we know whether it was the data or the rubric."
4. **Proof (60s):** calibration report — where the system ranked real historical outcomes right, **and where it was wrong, visibly**.
5. **Agentic surface (60s):** terminal; `/triage:dossier` inside Claude Code via the MCP server.
6. **War story (30s):** the bad entity merge that would have inflated a founder's track record — caught by the threshold + review queue, now an eval case.

Interviewers remember the failure story longer than the feature list. The war story is load-bearing.

**Fallback plan:** the demo environment is pinned to a data snapshot so the demo is deterministic; a pre-recorded 5-minute video and static screenshots exist as the fallback if anything live breaks. No demo heroics — a broken live demo wastes the room.

---

## 16. Success metrics & kill criteria

**If deployed at a firm (the real product):**

| Metric | Target (8 weeks) |
|---|---|
| Partner weekly active | ≥60% of partners open the briefing ≥6 weeks |
| IC memos starting from a Triage dossier | ≥50% |
| Override rate | Declining, or stable with documented reason codes (stable-with-reasons is *health*, not failure) |
| Counter-metric: briefing read time | <90s average = nobody reads it; the surface is wrong |

**Kill criteria (decided now, while calm):** at 8 weeks, if fewer than 2 partners use it weekly *and* override volume is near zero, the judgment layer is wrong or aimed at the wrong job. Kill it or pivot the wedge (e.g., to the concept radar, §17) — not to "improve onboarding." A first-pass product nobody argues with is dead: **arguing with it is the feature.**

**For the portfolio artifact itself:** the bar is the calibration report, the eval suite in CI, the war-stories doc, and a 5-minute unedited demo. Depth of what's built matters more than breadth — which is also the JD's stated bar.

---

## 17. Roadmap beyond MVP — the four embeddings

The JD describes the role as a series of embeds. The chassis generalizes; each embed is a new corpus + rubric on the same spine:

| Version | Wedge | JD line it answers |
|---|---|---|
| v1 (this PRD) | Founder/pipeline first pass | "Which founders to back, and how to score and rank them" |
| v2.0 | Talent: same graph + rubric machinery on operators for portfolio CEO/CTO seats | "How the firm sources, assesses, and hires internal talent" |
| v2.1 | Concept radar: thematic scoring across care areas → quarterly theme memo | "Which concepts to generate and pursue; which thematic areas to invest behind" |
| v2.2 | Buyout rewirability score: proven companies scored on AI-leverage surface (workflow automation potential, data exhaust, clinical-workflow integration depth) | "Venture buyout: rewiring proven products with AI" |

The generalization argument: the product is **rubric + evidence graph + calibration harness**. Healthcare venture is where it's built; nothing in the chassis is healthcare-specific — swap "company" for "bond issuer" or "acquisition target" and the pillars hold. That's the hedge-fund/IB translation of the "strong plus."

---

## 18. Design decisions log (ADR-lite)

Key decisions, the alternatives rejected, and why — the part of a PRD that shows judgment rather than requirements:

| Decision | Rejected alternative | Why |
|---|---|---|
| Citations hard-gated at schema level (§8.2) | Prompt instruction + post-hoc audit | Post-hoc audit catches violations *after trust is spent*; schema rejection prevents the artifact from existing. Enforcement at the boundary beats enforcement by exhortation |
| Deterministic-first entity resolution (§7.2) | Embedding-first | Embeddings propose, registries decide. Wrong merges poison scores silently; wrong *splits* are cheap and visible — asymmetry favors conservative merging |
| Weekly batch briefing + on-demand dossiers (§5.1) | Continuous stream | Batches create a shared ritual ("did you see #3?"); streams optimize for seeming busy. Shared attention is the product's distribution channel |
| Rubric in git, not in a DB (§6) | DB row + admin UI | A rubric change is a *decision*, and decisions deserve diffs, review, and history. A database row has none of those |
| Red-team pass in fresh context (§8.2) | Same-context self-critique | Self-critique inherits the draft's frame and mostly yields polite agreements. Fresh context attacks. Costs ~1 extra call per company — the cheap kind of safety |
| Tiered models (§11) | One frontier model everywhere | Extraction is contract-testable; judgment isn't. Spend where variance hurts |
| Recall-leaning ranked-10 with loud bear cases (§6.4) | Precision-leaning short list | §6.4: missed winners are invisible; weak #7s get skimmed and overridden — and the override is training signal |
| Synthetic CRM behind an adapter (FR-9) | Demo with scraped real relationships | The demo must be honest *by construction*. An adapter makes honesty free instead of effortful |

---

## 19. Open questions (each with a recommendation)

1. **Score visibility:** all partners, or author-only until IC? → **Recommend all, attributed.** Calibration requires shared exposure; private scores can't be argued with, and arguing is the feature.
2. **Cadence:** continuous stream vs. weekly brief? → **Weekly brief + continuous dossiers** (rationale: §18). Batches create a shared ritual; streams create noise.
3. **Model strategy:** one frontier model everywhere? → **Tiered.** Extraction/normalization on cheap models with contract tests; judgment on frontier with the eval suite as the regression gate.
4. **Generate new *concepts* in MVP?** → **No** (out of scope, §14.2). Scoring existing entities first earns the right to generate themes in v2.1 — calibration evidence first, synthesis second.
5. **How honest can the portfolio demo be about synthetic CRM data?** → **Fully honest, by design:** watermark + FR-9 adapter, and the demo script says the words "synthetic, swappable." Hiding it would forfeit the trust story that the whole product runs on.

---

## 20. Risks (top 3 — the rest live in §10's failure-mode table)

| Risk | Mitigation |
|---|---|
| "Toy data" smell | Real ClinicalTrials.gov / openFDA / EDGAR in the corpus; every claim cites a live URL; synthetic layer watermarked and labeled |
| Entity-resolution errors poison scores | Merge thresholds + review queue + the war story of the one we caught |
| Looks like an Affinity clone | The judgment layer *is* the product: rubric versioning, bear cases, calibration. Affinity stores relationships; Triage manufactures ranked judgment from them — and shows its work |

---

## Appendix A — JD traceability matrix

| JD requirement | Where it's answered | Shipped artifact |
|---|---|---|
| Decision-support for investors/dealmakers (strong plus) | Entire PRD; §1–§6 | Calibration report; evidence-linked briefing |
| Builds applications, not pipelines | §5, FR-1..9 | Deployed web app; 5-min unedited demo |
| Rebuilt own workflow around AI (skills, MCP, harnesses) | §12 | MCP server; 4 skills; evals in CI |
| Evals, context engineering, failure recovery | §6, §8–§11 | Eval suite; evidence-pack spec; war-stories doc; failure-mode table |
| Both sides of the line (investor ↔ engineer) | §3, §6, §15 | User-JTBD table; rubric as product artifact; demo narrative |
| Moves fast in ambiguity / defines the problem | §1, §14, §19 | This PRD; pre-agreed kill criteria |
| Knowledge graphs / semantic search (nice-to-have) | §7, §5.3 | Entity graph; warm-path search; pgvector retrieval |
| CRM-style intelligence (nice-to-have) | §5.3, §9.3 | Founder scorecards; override loop |
| Pre-LLM ML background (nice-to-have) | §9.2 | Ex-ante eval methodology; honest statistics |

---

## Appendix B — Objections I expect, and my answers

The questions this PRD should be attacked with, answered now so the demo isn't the first time:

1. **"LLM scores are noise."** Rankings vary — that's why stability is measured and reported (§9.1). But the evidence under every score is pinned (§8.3). The system's claim is not "the score is truth"; it's "the argument is auditable and the calibration is measured." Noise in a measured system beats intuition in an unmeasured one.

2. **"Why build an app at all — just use Claude Code directly?"** §2.1: ad-hoc agents produce analyses; Triage produces an institution — versioned rubric, corpus, eval suite, memory. Also, partners don't live in terminals; the briefing is a product *for them*, and the MCP surface is for the people who do.

3. **"n=30 calibration is statistically meaningless."** Directional, stated as such (§9.2). The harness matters more than the p-value, and growing n is cheap because labels come from public news. The real comparison isn't 30 vs. 300; it's 30 vs. zero.

4. **"Why would partners trust it?"** They don't have to — they argue with it. Trust is earned through visible bear cases and the override loop (§9.3); the system is designed to be disputed, not believed. A partner who overrides with a reason code is doing exactly what the product is for.

5. **"This is just prompt engineering."** The prompts are the smallest versioned artifact in the repo. The product is the corpus, the graph, the citation gate, the adversarial scoring loop, the eval suite, and the calibration loop. Prompt engineering is the paint; this PRD is about the plumbing — and the plumbing is where the JD's real bar lives.

6. **"You don't know healthcare."** Domain knowledge isn't claimed — the rubric *acquires* it: the regulatory/reimbursement dimensions force exactly the evidence a healthcare investor would demand, and the calibration set scores the result against reality. And the chassis is domain-agnostic by design (§17); that's the point.

7. **"Partners will never annotate anything."** Correct — if it costs more than ten seconds (§9.3). That's why overrides are one tap and one reason code, and why the fallback learning channel is passive: opens, dwell time, memo starts, silent drift toward the declined pile. A system that needs its users to do homework in order to improve is a system that won't improve.
