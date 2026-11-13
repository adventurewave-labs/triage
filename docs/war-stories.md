# War stories — what broke during the build

The PRD (§10) commits to this doc: every failure-mode row that fires during the build gets written up — what it corrupted, how it was caught, what it changed. Interviewers remember war stories longer than feature lists.

---

## Story #1 (seeded, designed — not yet a live incident)

**The bad merge that would have inflated a founder.**

A founder entity `ent:p:j-smith-acme` nearly merged with a same-normalized-name executive at an unrelated company. Under embedding-first resolution this merge would have silently combined two track records — and the founder scorecard's `outcome_quality` dimension would have credited an exit the person had nothing to do with.

**Design consequence (why this story is load-bearing):** resolution is deterministic-first with a review queue, not embedding-first (PRD §18). Wrong *splits* are cheap and visible; wrong *merges* poison scores silently. The queue is a product feature.

**Status:** seeded as the design rationale. To be replaced by the first real incident caught by `review_queue` during live ingestion.

---

*(Real entries land here as they happen — each with: what fired, what it corrupted, how it was caught, the eval case it became.)*
