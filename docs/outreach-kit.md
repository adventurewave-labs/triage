# Outreach kit — ready to send
*Companion to [interview-guide.md](./interview-guide.md). Fill the `[…]` placeholders, press send. The goal of each message is one 30-minute call — discovery, not a pitch.*

**Ground rules (read once):**
- Send from whatever account your mutual contact knows. A forwarded intro converts ~5× a cold DM.
- One follow-up after 4–5 business days, then stop. Silence is an answer.
- Log every reply in `docs/field-notes.md` (template below) — responses are field evidence too.

---

## 1. VC associate (any sector; healthcare a bonus)

**Subject: how do you decide what dies in the pile?**

> Hi [name] — [mutual contact / context: e.g. "we met at …" / "founder-friend X suggested I talk to you"].
>
> I'm building a decision-support tool for early-stage investment teams and I'm trying to understand the actual workflow of triage — not the version in blog posts. You sit closer to the inbound pile than almost anyone, so: what actually happens to the ~90% that never gets a partner meeting?
>
> 30 minutes, I'll keep it to six questions, and I'll share what I've built if it's useful to you. Any weekday before 10am your time works.
>
> [signature]

*If cold (no mutual):* open with a specific true detail from their public writing — a deal they sourced, a post — then the same ask. One sentence of flattery max.

## 2. Fund platform / deal-ops person

**Subject: which tool does your team actually open?**

> Hi [name] — I research how investment teams run sourcing and intake (CRM adoption, what gets logged vs. what doesn't). Platform people are the only ones who know which tools are actually used versus paid for, and I'd rather ask you than read another vendor whitepaper.
>
> 20–30 minutes: what does your pipeline tooling stack look like, what stuck, what quietly died by month three?
>
> Happy to share what I've built in return — an evidence-linked triage layer that sits upstream of the CRM.
>
> [signature]

*Platform people respond well to cold outreach about tooling — it's literally their job to have opinions here.*

## 3. IB associate / buy-side screening analyst

**Subject: screening workflows — sell-side vs. buy-side**

> Hi [name] — [connection]. I'm studying how dealmakers screen at volume — how a thesis becomes screening criteria becomes a longlist. VCs do a version of this; I want to check my model against the banking shape (numeric screens, mandate matching, long-list triage).
>
> 20 minutes on how your last screen actually ran? I'll share the decision-support system I built from the research.
>
> [signature]

## Follow-up nudge (day 4–5, same thread)

> One-line bump in case this got buried — still happy to trade 30 minutes for six questions. If it's a no, no hard feelings and I'll stop here.

---

## The six questions (paste into your calendar invite)

1. Walk me through the last company you escalated — what triggered it, what did you look at, how long did prep take?
2. What died in your pile last quarter, and why? *(the thesis question — record the pause)*
3. Where do signals actually reach you? What do you never open?
4. What tool do you pay for and secretly hate — and why do you keep paying?
5. Tell me about a time the process missed something that later mattered.
6. What would make you trust a machine-ranked list — and what would make you dismiss it in ten seconds?

## After each call — update `field-notes.md`, then patch the PRD

| Finding lands in | File |
|---|---|
| Provenance, quotes (anonymized by role) | `docs/field-evidence.md` + demo hook |
| Corrected workflow numbers | PRD §1.2 working assumptions |
| Schema-relevant artifacts (their column names, intake fields) | PRD §7.2 |
| Contradictions of the PRD | PRD §1/§6, **marked as revised after field conversations** |

A PRD that changed its mind because of interviews is a stronger artifact than one that never did — update and keep the changelog.
