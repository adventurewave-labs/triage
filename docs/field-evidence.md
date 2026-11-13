# Triage — field evidence (public sources)
*Companion to [triage-prd.md](./triage-prd.md). Gathered 2026-11-12.*

**Provenance, stated plainly:** this is evidence from *public* sources — research by Stanford GSB faculty, benchmark reports, and practitioner essays from fund operators. It is **not** a substitute for private conversations with investors. It exists so the PRD's workflow model rests on citable, real accounts rather than assertion. Where private conversations would add something public sources can't, that gap is listed explicitly at the bottom and marked as pending.

---

## Q1 — "Walk me through the last company you escalated."

**Public evidence:**

- VC decision-making runs through structured escalation: initial screening → partner pitch → IC memo → IC vote, with the deal lead "communicating directly with the management team and holding more information than anyone else in the room" ([Strebulaev, *Inside the Investment Committee*](https://ilyastrebulaev.substack.com/p/inside-the-investment-committee-how)).
- Memos exist to close the information asymmetry between the deal lead and the rest of the committee — "No regulation requires this and no contract compels it," yet nearly all practitioners say the practice produces better decisions.
- **"More often than not the job falls to juniors, such as VC associates."** The bottleneck analysis in PRD §1.1 lands on the right person.
- Some firms use a "three-tier investment memo practice" — different memos at different funnel stages (structure consistent with Triage's briefing → dossier → memo progression).

**Validates in PRD:** §1.1 (escalation as the bottleneck), §3 (associate JTBD), §5.4 (memo generator positioned mid-funnel, not at the end).

---

## Q2 — "What died in your pile last quarter — and why?"

**Public evidence:**

- **The average VC reviews 101 companies per investment made** — Stanford GSB research, phrased as "One hundred and one companies that made it far enough to enter the VC deal funnel" ([Strebulaev, *The Deal Funnel*](https://ilyastrebulaev.substack.com/p/the-deal-funnel-why-vcs-say-no-to)). The PRD's §1.2 estimate (~70–80% of signal exposure getting zero deep look) is conservative against this figure.
- The IC memo is explicitly treated as a **pre-outcome record**: "a time capsule from a version of you that didn't know how the story ended" — revisited after bad outcomes for missed flags, and after *passing on a winner* to study what was missed (Strebulaev, same piece). The industry already knows the pile contains ghosts; it just can't query it.

**Validates in PRD:** §1 thesis (attention, not sourcing), the declined section's rationale (§5.1), and the calibration premise (§9.2) — firms already want to study their passes; they lack the system to do it systematically.

---

## Q3 — "Where do signals actually reach you?"

**Public evidence:**

- Thesis-first screening is the standard first filter: the thesis "defines what belongs in your fund — and what doesn't"; leading firms keep a **written profile of the "ideal company" for consistency across reviewers** ([GVC Lab, *How VCs Filter Deals*](https://govclab.com/2025/10/29/how-vcs-filter-deals-in-emerging-vc)).
- Second-stage filters are time-boxed: "founder clarity, problem understanding, and early traction **within 30 minutes**."
- Contacts operate as sourcing scouts when the thesis is legible enough to repeat (e.g., Swizzle VC's four-word thesis, "Women's Health and Wealth").
- Review is iterative: after ~20 calls, one investor replaced unit-economics questions with prompts revealing how founders think — filtering rules get updated from outcomes.

**Validates in PRD:** §6 rubric-as-artifact — a written "ideal company profile" for reviewer consistency *is* a manual rubric; Triage version-automates what funds already try to do by hand. §6.4's recall-at-the-evidence-bar tuning is consistent with the 30-minute second-stage calls.

---

## Q4 — "What tool do you pay for and secretly hate?"

**Public evidence (the richest vein):**

- The adoption failure is the acknowledged CRM failure mode: **"83% of senior executives say their single biggest challenge with CRM software is getting staff to actually use it"** — a stat Affinity itself cites ([Blackmatter VC, *Affinity vs. Attio*](https://blackmatter.vc/lab/affinity-vs-attio-the-vc-crm-that-actually-sticks)).
- Shelfware dynamics, verbatim: funds "paying enterprise money for a feature you've never switched on"; buying "because everyone said to and mostly use it as a glorified contact list"; **"a team that quietly stops logging them by month three."**
- **"The Affinity-vs-Attio war is a distraction from the adoption war."**
- Design implications, verbatim: **"The CRMs that stick are the ones nobody has to think about."** "The best CRM is the one your partners actually use." **"Don't migrate — sync."**
- Economics: Affinity floor ~$2,000/user/yr; median buyer ~$61,626/yr (same source). Positive counter-case: 8VC cut deal-flow processing from 4 hours to 2 hours with Affinity ([case study](https://www.casestudies.com/company/affinity-co/case-study/8vc-cuts-deal-flow-process-time-by-50-using-affinity-crm-and-the-pathfinder-extension)) — the tool *can* work when adoption holds.
- A Blue Future Partners survey: number-one reason a firm evaluates a new tool is to "find and close deals better," cited by 59% of respondents (via Blackmatter).

**Validates in PRD:** §9.3's ≤10-second override design (adoption friction is the documented industry failure mode, in practitioners' own words), FR-9's sync-don't-replace adapter posture ("don't migrate — sync" is literally the design), and §2's claim that CRMs store relationships but generate no judgment.

---

## Q5 — "Tell me about a time the process missed something that later mattered."

**Public evidence:**

- **Unanimous rejections after full diligence produced "quite a few painful misses"** — and a 30-year investor's claim that every great investment involved "furious debate" with at least one partner opposed, with evidence that "unanimous enthusiasm rarely got fulfilled" (Strebulaev, *Inside the Investment Committee*).
- Firms study passed-on winners to understand what they missed — but memory is unreliable: it "is reshaped by subsequent events and colored by emotion," hence written pre-outcome records (Strebulaev).

**Validates in PRD:** §16's "arguing with it is the feature" — the furious-debate finding is the strongest possible support for a system designed to be disputed rather than believed. §9.2's calibration harness operationalizes the pass-on-a-winner postmortem the industry already wishes it did systematically.

---

## Q6 — "What would make you trust a machine-ranked list?"

**Public evidence (inferential — weakest of the six, flagged as such):**

- Trust patterns follow adoption patterns: tools stick when they "disappear into how the fund already works" (Blackmatter) — consistent with §9.3's in-flow design rather than a new destination app.
- Automation is already accepted *inside* the filter when it enforces a stated thesis: an AI screening tool that "automatically rate[s] deals based on thesis-relevancy, letting managers pass on irrelevant deals with the click of a button" (GVC Lab). Machines are trusted to *reject*; the contested act is trusting them to *rank* — which is exactly what Triage's evidence discipline and bear cases are built to address.
- Written criteria improve consistency across reviewers (GVC Lab) — the rubric-as-versioned-artifact (§6) is the machine analog of a practice funds already trust in humans.

**Remains hypothesis:** the exact trust threshold for a ranked list. This is the question the private conversations would answer best. Until then, the design answer stands on its own logic (§6.4, §9.3).

---

## The banker generalization (Q5's §17 claim)

- Buy-side screening is rubric-shaped in the banking literature: an acquisition thesis produces **"numeric screening criteria: size range, growth floor, margin profile, geography, customer profile"** ([BD Emerson](https://www.bdemerson.com/article/buy-side-ma-process)); deal teams build longlists against those criteria ([StrategyBridge](https://www.strategybridge.ai/resources/m-and-a-target-screening-how-the-best-deal-teams-build-better-longlists-faster)).
- The screen-then-narrow shape is identical to Triage's pillars; only the corpus and rubric change. The §17 claim now rests on sourced practice, not analogy.

---

## What public sources cannot answer (pending private conversations)

1. Actual escalation volumes and defensive-escalation frequency inside one firm (§1.2 estimates remain assumptions).
2. The exact trust threshold for machine ranking (Q6).
3. Whether partners would override at ≤10-second cost — design logic exists; field proof doesn't.
4. Read-time reality: what partners actually open on Sunday night (§16 counter-metric).

**Status:** 2–3 private conversations still recommended before the build (see [interview-guide.md](./interview-guide.md)). Until then, every workflow claim in the PRD cites a public source above. In the interview, the honest phrasing is: *"The workflow model is grounded in public operator accounts and Stanford research on the deal funnel — cited in the repo. Private-conversation validation is scheduled before the build."*
