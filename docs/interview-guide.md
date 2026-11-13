# Triage — field interview guide
*Companion to [triage-prd.md](./triage-prd.md). Purpose: convert §3's JTBD table from "derived from a job description" to "validated with named conversations." Three conversations, ~30 minutes each, before any code.*

> **Note:** public-source evidence is already gathered in [field-evidence.md](./field-evidence.md) — the 101:1 funnel figure, the adoption-war quotes, the IC-memo findings. These private conversations remain the supplement for the four things public sources can't answer (listed at the bottom of that file).

---

## Who to talk to (priority order)

### 1. Early-stage VC associate — any sector, healthcare a bonus
**Why them:** they *are* the §1.1 bottleneck. The associate makes the escalation decision daily, knows exactly what dies in the pile and why they escalated defensively, and is the most reachable person who actually runs the workflow. A partner is better for trust dynamics but much harder to get — take the associate, ask about their partner's behavior.
**How to find:** LinkedIn (associate + fund names in your city), founder friends who can intro their investors' associates (best path — warm intros convert), alumni networks.

### 2. Fund platform person — head of platform / platform associate / deal ops
**Why them:** they own sourcing pipelines, the CRM (Affinity or otherwise), deal intake, and IC logistics. They know which tools are actually used versus shelfware — ground truth for §2's prior-art table. They are also unusually responsive to cold outreach about tooling, because tooling is their job.
**How to find:** LinkedIn title search ("platform" + venture), VC-ops communities and Slack groups, cold DM works: "researching how investment teams triage deal flow — 20 minutes?"

### 3. One non-VC dealmaker — IB associate (tech/healthcare coverage) or HF/PE screening analyst
**Why them:** validates §17's generalization claim — "swap company for bond issuer and the pillars hold." One verbatim quote from a banker turns the hedge-fund/IB translation of the strong plus from asserted to demonstrated.
**How to find:** alumni, friends-of-friends. Bankers respond well to "studying screening workflows across buy-side and sell-side."

**Skip:** founders (they're the *screened*, not the screener), sales/RevOps people (adjacent but not investor judgment), AI engineers (they'll talk models, not workflow).

---

## What to ask (30 minutes)

**Discipline:** discovery, not pitch. Do not demo Triage unless they ask. If they push on what this is: "I'm researching how investment teams triage deal flow."

1. **"Walk me through the last company you escalated.** What triggered it, what did you look at, how long did the writeup take?" → validates §3 jobs and the 4–6 hr prep estimate.
2. **"What died in your pile last quarter — and why?"** → *the thesis question.* The PRD's §1 claim is that nobody can answer this. Watch what happens. If they can't, that's field confirmation — record it exactly as it happened, including the pause.
3. **"Where do signals actually reach you?** What do you read reliably, and what do you never open?" → validates §1.2 signal volumes and the read-time counter-metric in §16.
4. **"What tool do you pay for and secretly hate? Why keep paying?"** → the §2 gap in their own words. Shelfware stories are gold.
5. **"Tell me about a time the process missed something that later mattered."** → the false-negative story (§6.4). Almost everyone has one; it's usually a relationship channel story, which validates the systematic-channel framing.
6. **"What would make you trust a machine-ranked list — and what would make you dismiss it in ten seconds?"** → the bear-case/citation design (§6, §8.2) gets reality-checked by its actual users.

---

## What to bring back (the artifacts)

- **2–3 verbatim quotes** — ask permission, anonymize by role: "a partner at a $200M health fund said…"
- **The Q2 answer** — the thesis test, written down as it happened
- **Workflow artifacts they'll share** — pipeline spreadsheet columns, intake form fields, IC memo template (screenshots with permission). Their column names should influence the schema in §7.2
- **One "we tried that and it failed" story** — more valuable than any feature request; goes into §10's failure-mode table

---

## Where the findings land

| Finding | Lands in |
|---|---|
| Provenance line for §3 | JTBD table: "validated with N conversations (roles anonymized)" |
| Verbatim quotes | Demo hook (§15) and Appendix B answers |
| Escalation time estimates | §1.2 working assumptions, corrected with numbers |
| Workflow artifacts | §7.2 schema field names |
| Contradictions of the PRD | §1/§6 — updated *and marked as revised after field conversations*. A PRD that changed its mind because of interviews is a stronger artifact than one that never did |

If a conversation contradicts the PRD, that is the best possible outcome — better before the build than after. Update the doc and keep the changelog; it demonstrates the exact loop the product itself runs.
