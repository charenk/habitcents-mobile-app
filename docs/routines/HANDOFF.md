# core-worker HANDOFF

## COMPLETE (run 25, 2026-09-11: rebase across two real content conflicts, no new work)

`git rev-list --left-right --count origin/main...routine/core-p3` returned
`14 29`: `origin/main` had moved 14 commits since run 24's rebase (the
2026-09-10 "sheets: one platform pattern" pinned-title/pinned-footer
rewrite of `Sheet.tsx`, the leak-funnel/check-in-card wave, PRs #155-#159).
`git rebase origin/main` hit three genuine content conflicts, all inside
this branch's own run-4 entitlement-gate commit (`dd2c1b0`):

`components/habit-logging/PickOneSheet.tsx` and
`components/onboarding/BreakHabitSheet.tsx`, same shape in both: main's
pinned-footer rewrite had moved each gated sheet's CTA buttons into the new
`footer` prop, but left that footer undifferentiated ("See Premium / Maybe
later" always), losing the `atCeiling`-conditional split this branch added
back when the CTAs still lived in the scrolling body. Resolved by moving the
`atCeiling` conditional onto the `footer` prop in both files (a single
`ceilingDismiss` button at the ceiling, otherwise the existing upgrade/maybe-
later pair) and deleting the now-dead in-body button block, including
`style={styles.primary}` (confirmed unused post-rewrite in both files). The
gated body content itself (evidence, gate card, ceiling-conditional copy)
auto-merged clean. `design/decisions/components/BreakHabitSheet.md` was an
add/add conflict, main's full 2026-09-10 redesign rewrite against this
branch's 2026-09-05 entitlement entry with no shared ancestor; resolved by
keeping main's current doc as the base and folding this branch's decision in
as an additional entry (Decisions, States, Open), nothing dropped from
either side. Full reasoning in `docs/routines/PLAN.md`'s "Run 25" section.

Fresh `npm install` (node_modules removed first), `npx tsc --noEmit` clean.
`npm test`: 117 suites / 1206 tests green on the first attempt, no flake;
both `pickOneSheet.test.tsx` and `breakHabitSheetGate.test.tsx` pass,
confirming the footer restructuring changed no observable gate behavior.
Force-with-lease pushed (`1220dc7`). PR #132 confirmed via the API: `state:
open`, `draft: false`, `merged: false`, head and base both now current (base
`9376cc2d96ef095a87ded876cb23ad4b3b25d092`, main's tip), zero comments, zero
reviews, unchanged since run 15's "Approved, no fixes owed" for runs 12-14.
Re-pulled `habitcents-ops/PUNCHLIST.md`'s RESUME marker fresh: the items
newly added since run 24 (a profile modal-vs-push navigation decision, a
how-it-works scroll-fade question, sheet drag-to-dismiss device
verification, the standing `door3BreakSheet.test.tsx` CI-load flake, a
Categories empty-subtitle polish note) are all design/QA-shaped, none
payments/legal; the one core-p3-flagged line (leak finder dated entitlement)
is unchanged and was already built and closed on this branch at run 8; not
this routine's checkbox to flip. Nothing newly core-p3-shaped. PLAN.md's
checklist stays fully `[x]`/`(C)`; nothing code-shaped remains that this
routine can reach without a website-repo checkout or a Charen-gated external
account. No push notification this run: run 11's notification already
flagged the idle decision queue, and nothing in its content has changed
(still zero PR engagement since run 6, same 7-item queue run 9 first
compiled, now 19 runs idle), notwithstanding this run's real rebase-and-
resolve work.

## COMPLETE (run 24, 2026-09-10: rebase, no new work)

First real rebase since run 13 (runs 14-23 all found the branch already
even with `origin/main`). `git fetch origin main routine/core-p3` plus
`git rev-list --left-right --count origin/main...routine/core-p3` returned
`4 28`: `origin/main` had moved 4 commits (the 2026-09-07 Today docks /
How-it-works sheet wave, PR #154 and its stack), touching
`constants/strings.ts` and `design/decisions/components/{BreakHabitRow,
DockCard,HowItWorksSheet,QuickLogRow}.md` plus `design/decisions/modules/
today.md`. None of those overlap this branch's own edited entries
(`PickOneSheet.md`, `BreakHabitSheet.md`, `ShareCounterCard.md`,
`LeakFinderTeaser.md`), so `git rebase origin/main` completed with zero
conflicts (unlike run 13's two genuine content conflicts). Force-with-lease
pushed (`f0e89eb..d1dc86d`).

PR #132 confirmed via the API: `state: open`, `draft: false`, `merged:
false`, head now `f0e89ebed429f055c3402642adef3cfe638890a9` pre-push
(matches this branch's prior tip), base `b748ca35e0272a13d7a2f6e1c8b0b437dbf4f49c`
was main's tip before this run's rebase moved it to `beb49e5`, zero
comments (`get_comments` returned `[]`), zero reviews. No new REVIEW
FEEDBACK since run 15's "Approved, no fixes owed" for runs 12-14.
Re-pulled `habitcents-ops/PUNCHLIST.md`'s RESUME marker: unchanged from
runs 9-23, still only the 2026-09-05/06 zeroth-state design wave items
(device pass, canvas regen, ipad merge note, today-kept art) plus the
leak finder dated-entitlement line, which stays unchecked there but was
already built and closed on this branch at run 8; not this routine's
checkbox to flip. Nothing newly core-p3-shaped.

Fresh `npm install` (node_modules removed first, container had a stale
copy), `npx tsc --noEmit` clean. `npm test`: 113 suites / 1184 tests green
on the first attempt, no flake this run, exactly matching runs 13-23 (the
suite count itself hasn't moved because main's last 4 commits are a UI/copy
wave with no new or changed tests in files this branch's suite run touches
differently than before). PLAN.md's checklist stays fully `[x]`/`(C)`;
nothing code-shaped remains that this routine can reach without a
website-repo checkout or a Charen-gated external account. No push
notification this run: run 11's notification already flagged the idle
decision queue, and nothing in its content has changed (still zero PR
engagement since run 6, same 7-item queue run 9 first compiled, now 18
runs idle on the decision queue itself, notwithstanding this run's real
rebase work).

## COMPLETE (run 23, 2026-09-10: re-verify, no new work)

Fourteenth idle run since the decision queue first went up at run 6
(runs 9-23, minus run 13's rebase). `git fetch origin main
routine/core-p3` plus `git rev-list --left-right --count
origin/main...routine/core-p3` returned `0 27`: zero commits on main's
side, branch unchanged at tip `be7edbd`, no rebase needed. PR #132
confirmed via the API: `state: open`, `draft: false`, `mergeable_state:
clean`, `merged: false`, head `be7edbd980cd6b3f947ec28afa7ce7accc9fc589`
(matches this branch's tip), base
`b748ca35e0272a13d7a2f6e1c8b0b437dbf4f49c` (matches main's current tip),
zero comments, zero reviews, unchanged since run 22. No new REVIEW
FEEDBACK since run 15's "Approved, no fixes owed" for runs 12-14.
Re-pulled `habitcents-ops/PUNCHLIST.md`'s RESUME marker (ops main
fast-forwarded `8d2a09f..0d279b3`, but that range touched only
`docs/runs.log`): byte-identical to what runs 9-22 read, still only the
2026-09-05/06 zeroth-state design wave items (device pass, canvas
regen, ipad merge note, today-kept art) plus the leak finder
dated-entitlement line, which stays unchecked there but was already
built and closed on this branch at run 8; not this routine's checkbox
to flip. Nothing newly core-p3-shaped.

Fresh `npm install`, `npx tsc --noEmit` clean. `npm test`: 113 suites /
1184 tests green on the first attempt, no flake this run, exactly
matching runs 13-22. PLAN.md's checklist stays fully `[x]`/`(C)`;
nothing code-shaped remains that this routine can reach without a
website-repo checkout or a Charen-gated external account. No new push
notification this run: run 11's notification already flagged the idle
decision queue, and nothing in its content has changed (still zero PR
engagement, same 7-item queue run 9 first compiled, now 17 runs idle).

## COMPLETE (run 22, 2026-09-10: re-verify, no new work)

Thirteenth idle run since the decision queue first went up at run 6
(runs 9-22, minus run 13's rebase). `git fetch origin main
routine/core-p3` plus `git rev-list --left-right --count
origin/main...routine/core-p3` returned `0 26`: zero commits on main's
side, branch unchanged at tip `cf0a247`, no rebase needed. PR #132
confirmed via the API: `state: open`, `draft: false`, `mergeable_state:
clean`, `merged: false`, head `cf0a247bc81902c5a0844995ad6936a2ee519bfd`
(matches this branch's tip), base
`b748ca35e0272a13d7a2f6e1c8b0b437dbf4f49c` (matches main's current tip),
zero comments, zero reviews, unchanged since run 21. No new REVIEW
FEEDBACK since run 15's "Approved, no fixes owed" for runs 12-14.
Re-pulled `habitcents-ops/PUNCHLIST.md`'s RESUME marker (ops main
fast-forwarded `cc87a3c..8d2a09f`, but that range touched only
`docs/runs.log`): byte-identical to what runs 9-21 read, still only the
2026-09-05/06 zeroth-state design wave items (device pass, canvas
regen, ipad merge note, today-kept art) plus the leak finder
dated-entitlement line, which stays unchecked there but was already
built and closed on this branch at run 8; not this routine's checkbox
to flip. Nothing newly core-p3-shaped.

Fresh `npm install`, `npx tsc --noEmit` clean. `npm test`: 113 suites /
1184 tests green on the first attempt, no flake this run, exactly
matching runs 13-21. PLAN.md's checklist stays fully `[x]`/`(C)`;
nothing code-shaped remains that this routine can reach without a
website-repo checkout or a Charen-gated external account. No new push
notification this run: run 11's notification already flagged the idle
decision queue, and nothing in its content has changed (still zero PR
engagement, same 7-item queue run 9 first compiled, now 16 runs idle).

## COMPLETE (run 21, 2026-09-10: re-verify, no new work)

Twelfth idle run since the decision queue first went up at run 6 (runs
9-21, minus run 13's rebase). `git fetch origin main routine/core-p3`
plus `git merge-base --is-ancestor origin/main HEAD` confirmed the
branch already contains `origin/main`'s tip (`b748ca3`, unchanged since
run 20), no rebase needed. PR #132 confirmed via the API: `state: open`,
`draft: false`, `mergeable_state: clean`, `merged: false`, head
`1f4e31394a48f0f32235789203081ae689e538f3` (matches this branch's tip),
base `b748ca35e0272a13d7a2f6e1c8b0b437dbf4f49c` (matches main's current
tip), zero comments, zero reviews, unchanged since run 20. No new REVIEW
FEEDBACK since run 15's "Approved, no fixes owed" for runs 12-14.
Re-pulled `habitcents-ops/PUNCHLIST.md`'s RESUME marker: byte-identical
to what runs 9-20 read, still only the 2026-09-05/06 zeroth-state design
wave items (device pass, canvas regen, ipad merge note, today-kept art)
plus the leak finder dated-entitlement line, which stays unchecked there
but was already built and closed on this branch at run 8; not this
routine's checkbox to flip. Nothing newly core-p3-shaped.

Fresh `npm install`, `npx tsc --noEmit` clean. `npm test`: 113 suites /
1184 tests green on the first attempt, no flake this run, exactly
matching runs 13-20. PLAN.md's checklist stays fully `[x]`/`(C)`; nothing
code-shaped remains that this routine can reach without a website-repo
checkout or a Charen-gated external account. No new push notification
this run: run 11's notification already flagged the idle decision queue,
and nothing in its content has changed (still zero PR engagement, same
7-item queue run 9 first compiled, now 15 runs idle).

## COMPLETE (run 20, 2026-09-09: re-verify, no new work)

Eleventh idle run since the decision queue first went up at run 6 (runs
9-20, minus run 13's rebase). `git fetch origin main routine/core-p3`
plus `git rev-list --left-right --count origin/main...routine/core-p3`
returned `0 24`: zero commits on main's side, branch unchanged at tip
`e39b807`, no rebase needed. PR #132 confirmed via the API: `state:
open`, `draft: false`, `mergeable_state: clean`, `merged: false`, head
`e39b8079d9b071eeeb49fe74854009fbadd1e945` (matches this branch's tip),
base `b748ca35e0272a13d7a2f6e1c8b0b437dbf4f49c` (matches main's current
tip), zero comments, zero reviews, unchanged since run 19. No new
REVIEW FEEDBACK since run 15's "Approved, no fixes owed" for runs
12-14. Re-pulled `habitcents-ops/PUNCHLIST.md`'s RESUME marker (ops
main fast-forwarded `cc87a3c..123b700`, but that range touched only
`docs/runs.log`): byte-identical to what runs 9-19 read, still only the
2026-09-05/06 zeroth-state design wave items (device pass, canvas
regen, ipad merge note, today-kept art) plus the leak finder
dated-entitlement line, which stays unchecked there but was already
built and closed on this branch at run 8; not this routine's checkbox
to flip. Nothing newly core-p3-shaped.

Fresh `npm install`, `npx tsc --noEmit` clean. `npm test`: 113 suites /
1184 tests green on the first attempt, no flake this run, exactly
matching runs 13-19. PLAN.md's checklist stays fully `[x]`/`(C)`;
nothing code-shaped remains that this routine can reach without a
website-repo checkout or a Charen-gated external account. No new push
notification this run: run 11's notification already flagged the idle
decision queue, and nothing in its content has changed (still zero PR
engagement, same 7-item queue run 9 first compiled, now 14 runs idle).

## COMPLETE (run 19, 2026-09-09: re-verify, no new work)

Tenth idle run since the decision queue first went up at run 6 (runs
9-19, minus run 13's rebase). `git fetch origin main routine/core-p3`
plus `git rev-list --left-right --count origin/main...HEAD` confirmed
zero commits in either direction (branch still even with main's tip
`b748ca3`), no rebase needed. PR #132 confirmed via the API: `state:
open`, `draft: false`, `mergeable_state: clean`, `merged: false`, head
`221d225` (matches this branch's tip), base `b748ca3` (matches main's
current tip), zero comments, zero reviews, unchanged since run 18. No
new REVIEW FEEDBACK since run 15. Re-pulled `habitcents-ops/PUNCHLIST.md`'s
RESUME marker: byte-identical to what runs 9-18 read, still only the
2026-09-05/06 zeroth-state design wave items (device pass, canvas
regen, ipad merge note, today-kept art) plus the leak finder
dated-entitlement line, which stays unchecked there but was already
built and closed on this branch at run 8; not this routine's checkbox
to flip. Nothing newly core-p3-shaped.

Fresh `npm install`, `npx tsc --noEmit` clean. `npm test`: 113 suites /
1184 tests green on the first attempt, no flake this run, exactly
matching runs 13-18. PLAN.md's checklist stays fully `[x]`/`(C)`;
nothing code-shaped remains that this routine can reach without a
website-repo checkout or a Charen-gated external account. No new push
notification this run: run 11's notification already flagged the idle
decision queue, and nothing in its content has changed (still zero PR
engagement, same 7-item queue run 9 first compiled, now 13 runs idle).

## COMPLETE (run 18, 2026-09-09: re-verify, no new work)

Ninth idle run since the decision queue first went up at run 6 (runs
9-18, minus run 13's rebase). `git fetch origin main routine/core-p3`
plus `git log HEAD..origin/main --oneline` and the reverse direction
confirmed the branch still contains `origin/main`'s tip (`b748ca3`,
unchanged since run 13's rebase; zero commits either direction), no
rebase needed. PR #132 confirmed via the API: `state: open`,
`draft: false`, `mergeable_state: clean`, `merged: false`, head
`575f871` (matches this branch's tip), base `b748ca3` (matches main's
current tip), zero comments. No new REVIEW FEEDBACK since run 15 (the
runs 12-14 entry stays the last one, already addressed). Re-pulled
`habitcents-ops/PUNCHLIST.md`'s RESUME marker via a fresh `git fetch`
on that repo (`cc87a3c..aabe386`, but that range touched only
`docs/runs.log`, nothing in PUNCHLIST.md): RESUME marker byte-identical
to what runs 9-17 read, still only the 2026-09-05/06 zeroth-state
design wave items (device pass, canvas regen, ipad merge note,
today-kept art) plus the leak finder dated-entitlement line, which
stays unchecked there but was already built and closed on this branch
at run 8; not this routine's checkbox to flip. Nothing newly
core-p3-shaped.

Fresh `npm install`, `npx tsc --noEmit` clean. `npm test`: 113 suites /
1184 tests green on the first attempt, no flake this run, exactly
matching runs 13-17 (run 16's flake was a one-off). PLAN.md's checklist
stays fully `[x]`/`(C)`; nothing code-shaped remains that this routine
can reach without a website-repo checkout or a Charen-gated external
account. No new push notification this run: run 11's notification
already flagged the idle decision queue, and nothing in its content has
changed (still zero PR engagement, same 7-item queue run 9 first
compiled, now 12 runs idle).

## COMPLETE (run 17, 2026-09-09: re-verify, no new work)

Eighth idle run since the decision queue first went up at run 6 (runs
9-17, minus run 13's rebase). `git fetch origin main` plus `git
merge-base --is-ancestor origin/main HEAD` confirmed the branch still
contains `origin/main`'s tip (`b748ca3`, unchanged since run 13's
rebase; `git rev-list --left-right --count origin/main...HEAD` showed
zero commits on main's side), no rebase needed. PR #132 confirmed via
the API: `state: open`, `draft: false`, `mergeable_state: clean`, head
`4011dcc` (matches this branch's tip), base `b748ca3` (matches main's
current tip), zero comments, zero reviews, unchanged since run 16. No
new REVIEW FEEDBACK since run 15 (the runs 12-14 entry stays the last
one, already addressed). Re-pulled `habitcents-ops/PUNCHLIST.md`'s
RESUME marker: byte-identical to what runs 9-16 read, still only the
2026-09-05/06 zeroth-state design wave items (device pass, canvas
regen, ipad merge note, today-kept art) plus the leak finder
dated-entitlement line, which stays unchecked there but was already
built and closed on this branch at run 8; not this routine's checkbox
to flip. Nothing newly core-p3-shaped.

Fresh `npm install`, `npx tsc --noEmit` clean. `npm test`: 113 suites /
1184 tests green on the first attempt, no flake this run, exactly
matching runs 13-16. PLAN.md's checklist stays fully `[x]`/`(C)`;
nothing code-shaped remains that this routine can reach without a
website-repo checkout or a Charen-gated external account. No new push
notification this run: run 11's notification already flagged the idle
decision queue, and nothing in its content has changed (still zero PR
engagement, same 7-item queue run 9 first compiled, now 11 runs idle).

## COMPLETE (run 16, 2026-09-08: re-verify, no new work)

Seventh idle run since the decision queue first went up at run 6 (runs
9-16, minus run 13's rebase). `git fetch origin main` plus `git
merge-base --is-ancestor origin/main HEAD` confirmed the branch still
contains `origin/main`'s tip (`b748ca3`, unchanged since run 13's
rebase), no rebase needed. PR #132 confirmed via the API: `state: open`,
`draft: false`, `mergeable_state: clean`, head `c99392f` (matches this
branch's tip), base `b748ca3` (matches main's current tip), zero
comments, zero reviews. No new REVIEW FEEDBACK since run 15 (the runs
12-14 entry was already addressed there: "Approved, no fixes owed").
Re-pulled `habitcents-ops/PUNCHLIST.md`'s RESUME marker: byte-identical
to what runs 9-15 read, still only the 2026-09-05/06 zeroth-state design
wave items (device pass, canvas regen, ipad merge note, today-kept art)
plus the leak finder dated-entitlement line, which stays unchecked there
but was already built and closed on this branch at run 8; not this
routine's checkbox to flip. Nothing newly core-p3-shaped.

Fresh `npm install`, `npx tsc --noEmit` clean. `npm test` hit the same
known `door3BreakSheet.test.tsx` auto-open timing flake as runs 10, 12,
and 14 (unrelated file, not touched by anything on this branch,
5s-default-Jest-timeout under full-suite load); re-ran that file alone
per the one-allowed-rerun policy, all 17 passed in 5.4s. Full suite then
green: 113 suites / 1184 tests, exactly matching runs 13-15. PLAN.md's
checklist stays fully `[x]`/`(C)`; nothing code-shaped remains that this
routine can reach without a website-repo checkout or a Charen-gated
external account. No new push notification this run: run 11's
notification already flagged the idle decision queue, and nothing in its
content has changed (still zero PR engagement, same 7-item queue run 9
first compiled).

## COMPLETE (run 15, 2026-09-08: re-verify, no new work)

Sixth idle run since the decision queue first went up at run 6 (runs
9-15, minus run 13's rebase). `git fetch origin main` plus `git log
--oneline routine/core-p3..origin/main` showed zero new commits since run
13's rebase, so the branch still contains `origin/main`'s tip (`b748ca3`),
no rebase needed. PR #132 confirmed via the API: `state: open`, `draft:
false`, `mergeable_state: clean`, head `bb3301d` (matches this branch's
tip), base `b748ca3` (matches main's current tip), zero comments, zero
reviews. The one new item since run 14 was the orchestrator's
2026-09-08 REVIEW FEEDBACK entry covering runs 12-14: **"Approved, no
fixes owed"**, nothing to act on. Re-pulled `habitcents-ops/PUNCHLIST.md`'s
RESUME marker: byte-identical to what runs 9-14 read, still only the
2026-09-05/06 zeroth-state design wave items (device pass, canvas regen,
ipad merge note, today-kept art) plus the leak finder dated-entitlement
line, which stays unchecked there but was already built and closed on
this branch at run 8; not this routine's checkbox to flip. Nothing newly
core-p3-shaped.

Fresh `npm install`, `npx tsc --noEmit` clean. `npm test`: 113 suites /
1184 tests green on the first attempt, no flake this run, exactly
matching runs 13-14. PLAN.md's checklist stays fully `[x]`/`(C)`; nothing
code-shaped remains that this routine can reach without a website-repo
checkout or a Charen-gated external account. No new push notification
this run: run 11's notification already flagged the idle decision queue,
and nothing in its content has changed (still zero PR engagement, same
7-item queue run 9 first compiled; the orchestrator's run 4 note calling
item 5 "most urgent" doesn't change what's in the queue or add an action
this routine can take).

## COMPLETE (run 14, 2026-09-08: re-verify, no new work)

Fifth idle run since the decision queue first went up at run 6 (runs 9-14,
minus run 13's rebase). `git fetch origin main` came back empty; `git log
--oneline routine/core-p3..origin/main` showed zero commits, so the branch
already contains `origin/main`'s tip (`b748ca3`, unchanged since run 13's
rebase). PR #132 confirmed via the API: `state: open`, `draft: false`,
`mergeable_state: clean`, `head` sha `2cec209` (matches this branch's tip),
`base` sha `b748ca3` (matches main's current tip), zero comments, zero
reviews, no new REVIEW FEEDBACK since run 8-11's "Approved, no fixes owed."
Re-pulled `habitcents-ops/PUNCHLIST.md`'s RESUME marker: byte-identical to
what runs 9-13 read, still only the 2026-09-05/06 zeroth-state design wave
items (device pass, canvas regen, ipad merge note, today-kept art) plus the
leak finder dated-entitlement line, which stays unchecked there but was
already built and closed on this branch at run 8; not this routine's
checkbox to flip. Nothing newly core-p3-shaped.

Fresh `npm install` (node_modules absent in this container), `npx tsc
--noEmit` clean. `npm test` hit the same known `door3BreakSheet.test.tsx`
full-suite timing flake as runs 10 and 12 (unrelated file, not touched by
anything on this branch); re-ran that file alone per the one-allowed-rerun
policy, all 17 passed in 5.3s. Full suite then green: 113 suites / 1184
tests, exactly matching run 13's ending count (no regression, no new code).
PLAN.md's checklist stays fully `[x]`/`(C)`; nothing code-shaped remains
that this routine can reach without a website-repo checkout or a
Charen-gated external account. No new push notification this run: run 11's
notification already flagged the idle decision queue, and nothing has
changed in its content since (still zero PR engagement, same 7-item queue
run 9 first compiled).

## COMPLETE (run 13, 2026-09-08: rebase across a real content conflict, no new plan work)

First non-mechanical rebase this branch has hit. `git merge-base
--is-ancestor origin/main HEAD` showed the branch was 6 commits behind
`origin/main`'s new tip (`b748ca3`, up from `a51ce4a`). Rebase hit three
conflicts, not just the usual `design/decisions/README.md` index line:

1. `design/decisions/README.md` component index, twice (once per branch
   commit it replayed past) — the standard union resolution runs 7/8
   already documented, nothing new.
2. `design/decisions/components/LeakFinderTeaser.md`, genuine content
   conflict. Main's `db02fb5`/`b9814f8` (2026-09-07, Charen's own edit)
   trimmed the teaser body to one line and added two new Decisions/Open
   entries (the drawer-vs-cut rejection, the pane-centring note, the
   "two halves of the offer disagree" flag); this branch's run 8 commit
   had added the dated-grant Decisions entry and rewritten the same Open
   section to close out "the six months cannot be granted". Resolved by
   keeping both sides' Decisions entries (newest first: the two 2026-09-07
   ones, then run 8's), and merging Open/Iterations so main's newer
   pane-centring and offer-mismatch items survive alongside this branch's
   grant-timing item and the resolved "cannot be granted" bullet stays
   removed (main's copy of that bullet was stale, written before this
   branch's fix existed).
3. `utils/analytics.ts`'s `AnalyticsEventMap`, genuine but mechanical:
   main added `how_it_works_opened` (Charen-approved 2026-09-07, unrelated
   feature) in the same spot this branch's `leak_finder_promo_activated`
   entry landed. Both are additive, structural, payload-free events with
   no other registry to update (confirmed via grep: only one call site
   each, `app/(tabs)/index.tsx` and `utils/purchases.ts`). Kept both.

No REVIEW FEEDBACK section was present (none added since run 12), and
`habitcents-ops/PUNCHLIST.md`'s RESUME marker (pulled fresh, latest commit
touching it is still `bfd1376`, the already-closed leak-finder item) is
unchanged from runs 9-12: still only the 2026-09-05 zeroth-state design
wave items, none core-p3-shaped. PLAN.md's checklist is unchanged, still
fully `[x]`/`(C)`.

Fresh `npm install`, `npx tsc --noEmit` clean. `npm test`: 113 suites /
1184 tests green on the first attempt, no flake (up from 110/1165, all
from main's own new tests carried in by the rebase, not new code here).
Force-with-lease pushed (`d3aca7f..57516ae`); PR #132 confirmed via the
API with `head` now matching and `base` now `b748ca3` (main's current
tip), zero comments, zero reviews, still open/not-draft. Decision queue
for Charen is unchanged from run 9 (reproduced in that run's section
below); no new push notification this run, since nothing changed that run
11's notification didn't already cover, and this run's own content is a
mechanical rebase, not a new finding for Charen to act on.

## COMPLETE (run 12, 2026-09-07: re-verify, no new work)

Fourth consecutive idle run (runs 9-12 all "re-verify, no new work").
`git merge-base --is-ancestor origin/main HEAD` confirmed the branch still
contains `origin/main`'s tip (`a51ce4a`, unchanged since run 11); no rebase
needed. PR #132 confirmed via the API: `state: open`, `draft: false`,
`mergeable_state: clean`, base sha `a51ce4afdf88abb45c2982ab8b3e5a89f534e534`
(matches main's current tip exactly), zero comments, unchanged in
substance since run 11. Re-checked `habitcents-ops/PUNCHLIST.md`'s RESUME
marker: byte-identical to what runs 9-11 read, still only the 2026-09-05
zeroth-state design wave items (device pass, canvas regen, ipad merge
note, today-kept art) plus the 2026-09-06 leak-finder dated-entitlement
line, which is still shown unchecked there but was already built and
closed on this branch at run 8 (`activateLeakFinderPromoIfEligible`); that
checkbox is not this routine's to flip (PUNCHLIST.md lives in the ops repo
under a different process), so left as-is. Nothing newly core-p3-shaped.

Fresh `npm install` (node_modules absent in this container), `npx tsc
--noEmit` clean. `npm test` first run hit the same known flake as run 10:
`__tests__/door3BreakSheet.test.tsx`'s auto-open test timed out at the
full-suite default 5s Jest timeout (109/1165, 1 failure). Re-ran that file
alone per the one-allowed-rerun policy: all 17 passed in 5.3s. Full suite
then green: 110 suites / 1165 tests, exactly matching runs 9-11. PLAN.md's
checklist is unchanged, still fully `[x]`/`(C)`; nothing code-shaped
remains that this routine can reach without a website-repo checkout or a
Charen-gated external account. Decision queue for Charen is unchanged from
run 9 (reproduced in run 9's section below); no new push notification this
run since run 11 already flagged the idle queue and nothing has changed
since.

## COMPLETE (run 11, 2026-09-07: re-verify, no new work)

Third consecutive idle run (runs 9, 10, 11 all "re-verify, no new work").
`git merge-base --is-ancestor origin/main HEAD` confirmed the branch already
contains `origin/main`'s tip (`a51ce4a`, the navigation-docs merge) even
though `git fetch` showed main had moved since this container last saw it;
no rebase needed. PR #132 confirmed via the API: `state: open`, `draft:
false`, `mergeable_state: clean`, base sha `a51ce4a` (matches main's current
tip exactly), zero comments, zero reviews, `updated_at` unchanged in
substance since run 10 (only GitHub's own head-sha bookkeeping). Checked
`habitcents-ops/PUNCHLIST.md`'s RESUME marker again: byte-identical to what
run 10 read, still only the 2026-09-05 zeroth-state design wave (device
pass, canvas regen, ipad merge note, today-kept art), none core-p3-shaped.
Fresh `npm install` (node_modules absent in this container), `npx tsc
--noEmit` clean, `npm test`: 110 suites / 1165 tests green on the first run,
no flake this time, exactly matching runs 9 and 10. PLAN.md's checklist is
unchanged, still fully `[x]`/`(C)`; nothing code-shaped remains that this
routine can reach without a website-repo checkout or a Charen-gated
external account. Decision queue for Charen is unchanged from run 9,
reproduced below.

**Worth naming plainly:** the decision queue below has now sat untouched
across runs 6 through 11 (2026-09-05 through 2026-09-07, three re-verify
runs with zero PR comments or reviews in that span). PR #132 is green,
`clean`, and has been "ready for review" since run 6; nothing on this
branch is blocked on more agent work, only on Charen's court. Sending one
notification this run to flag that, matching how `routine/ipad` handled
its own multi-run idle stretch.

## COMPLETE (run 10, 2026-09-07: re-verify, no new work)

Same conclusion as run 9, one run later. `git fetch origin main` empty
(branch already even with `origin/main`, no rebase needed). PR #132
confirmed via the API: `mergeable_state: clean`, `draft: false`, zero
comments, zero reviews since run 9. `habitcents-ops/PUNCHLIST.md`'s RESUME
marker is unchanged (still the 2026-09-05 zeroth-state wave items; none
core-p3-shaped). Fresh `npm install`, `npx tsc --noEmit` clean. `npm test`
hit one flaky timeout (`__tests__/door3BreakSheet.test.tsx`'s auto-open
test, unrelated file, 5s default Jest timeout under full-suite load);
re-ran that file alone, all 17 passed in 5.5s, confirming the flake per
the one-allowed-rerun policy. Full suite then green: 110 suites / 1165
tests, exactly matching run 9. PLAN.md's checklist stays fully `[x]`/`(C)`;
nothing code-shaped remains here without a website-repo checkout or a
Charen-gated external account. PR #132 stays ready for review. Decision
queue for Charen is unchanged from run 9, reproduced below.

## COMPLETE (run 9, 2026-09-06: re-verify, no new work)

`git fetch origin main` showed no new commits since run 8 (branch already
even with `origin/main`, `mergeable_state: clean` confirmed via the PR API,
no rebase needed). No new REVIEW FEEDBACK was present in this file or on
PR #132 (checked the PR's comment list directly via the API: empty).
Re-checked `habitcents-ops/PUNCHLIST.md`'s RESUME marker for a new
core-p3-flagged item the way run 8 found the leak-finder promo gap: the
current marker's one dated item (2026-09-06, the leak finder promo) is
exactly what run 8 already closed; its other four items (build-20 device
pass, canvas regeneration, an ipad-routine merge note, a today-kept art
asset decision) all belong to the `design/enhancements-zeroth-state` wave,
none are core-p3/payments-shaped, so none belong on this branch. Re-verified
from a fresh `npm install` (node_modules absent in this container):
`npx tsc --noEmit` clean, `npm test` 110 suites / 1165 tests green, exactly
matching run 8's ending count (no regression, nothing new to add). PLAN.md's
checklist is fully `[x]`/`(C)`; nothing code-shaped remains that this
routine can reach without a website-repo checkout or a Charen-gated
external account. Marking PR #132 ready for review per the routine's own
completion instructions. Decision queue for Charen is unchanged from run 6,
plus run 8's new grant-timing item; both reproduced below for one place to
read them.

**Decision queue Charen must clear:**

1. App Store privacy label: review `docs/legal/app-store-privacy-labels.md`
   in full, accept or override its one judgment call (section 3: bucketed
   spend amounts under "Financial Info" vs "Usage Data"; recommendation
   stands: "Usage Data"), and resolve the one open verification (section 4
   item 3: PostHog's IP-handling default). Then transcribe into App Store
   Connect. Not code; nothing to merge for this specifically.
2. RevenueCat dashboard entitlement name must match
   `EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID` (defaults to `'premium'`).
3. When to actually build and test the live RevenueCat client (needs a
   real device build; still mock-mode by default, no go-live date picked).
4. A real device pass for the share card once a native build exists:
   confirm the captured PNG and that the OS share sheet receives a usable
   image on both iOS and Android.
5. The live-path entitlement-reactivity wiring (customerInfo update
   listener repainting a mounted screen) is code-reviewable but not
   unit-testable in this sandbox (documented under Blockers below). Worth
   a manual check once RevenueCat activation gets a real device build.
6. Informational, not a decision: this branch adds `react-native-purchases`
   (RevenueCat) as a second env-gated exception to the CLAUDE.md "no
   network calls in app source" rule, alongside PostHog. Worth a CLAUDE.md
   wording amendment when this PR is reviewed.
7. **From run 8.** When the leak finder promo's six-month clock starts.
   Built to the safer default: it starts when `SCAN_FLOW_ENABLED` flips
   true (the feature the receipt promises becomes reachable), not at the
   opt-in tap, so a long dormancy behind the flag cannot quietly eat into
   the offer. If the tap itself should start the clock instead, that is a
   one-line change (`utils/purchases.ts`'s
   `activateLeakFinderPromoIfEligible`, drop the `SCAN_FLOW_ENABLED`
   check).

Standing blockers (unchanged from runs 1-8, none block this routine's own
work, listed so a reviewer has them in one place):
- No website repo access, so P3-3/P3-4/P3-5 cannot be verified or advanced
  here.
- Live RevenueCat end-to-end verification (a real sandbox purchase) needs
  a real device build.
- The share card's capture-and-share path has no real-device pass.
- The live-path reactivity wiring (customerInfo update listener) is
  code-reviewable but not unit-testable in this sandbox: this project's
  Jest/Babel setup cannot execute a real dynamic
  `import('react-native-purchases')` at all, so no test here can
  distinguish "wired correctly" from "wired but silently broken" for that
  one listener path.

## Status (run 8, 2026-09-06: dated entitlement for the leak finder promo)

New work picked up from PUNCHLIST.md's 2026-09-06 RESUME marker (not a
rebase-only run like 6 and 7): `main`'s leak-finder coming-soon wrap
(mobile PR #144, decision 0009) shipped a receipt promising everyone who
opts in six months of premium, and flagged in its own commit message and
`design/decisions/components/LeakFinderTeaser.md`'s Open section that
nothing in the app could grant it. The punch list item said this belongs
with core-p3 (payments is always a human gate). Full detail of what was
built is in `docs/routines/PLAN.md`'s "Run 8" section; short version:
`utils/purchases.ts` gained a timed promotional grant
(`activateLeakFinderPromoIfEligible`, called at boot and right after a
fresh opt-in), composing with the existing free/mock/live `Entitlement`
rather than replacing it. `npx tsc --noEmit` clean. `npm test`: 110 suites
/ 1165 tests green (up from 109/1154 after rebasing onto `origin/main`,
which had moved 10 commits since run 7; +1 suite, +11 tests from this
run's own work).

This is not marked COMPLETE: one real decision (see below, new, not on the
run 6 decision queue) was made to a safer default rather than deferred,
and PR #132 was already marked ready for review at the end of run 7, so it
needs a fresh look now that new code landed on it. Next run: check for
REVIEW FEEDBACK first as usual; if none, this is likely COMPLETE again
(checklist-wise there is nothing else queued), but re-confirm
PUNCHLIST.md's RESUME marker hasn't picked up another core-p3 item the way
this one did, since that is now how new work reaches this branch between
the original P3/P4 checklist items.

**New decision for Charen, run 8 (not on run 6's queue below):** when the
leak finder promo's six-month clock starts. Built to start when
`SCAN_FLOW_ENABLED` flips true (the feature the receipt promises becomes
reachable), not at the opt-in tap, on the reasoning that a long dormancy
behind the flag would otherwise quietly eat into the offer, which is the
exact broken promise the punch list item warned about. If the tap itself
should start the clock instead, that is a one-line change
(`utils/purchases.ts`'s `activateLeakFinderPromoIfEligible`, drop the
`SCAN_FLOW_ENABLED` check). Not blocking: this is a promotional grant with
no dashboard entitlement or pricing behind it, so nothing here needed an
external account or key, unlike the run 6 queue's items.

## COMPLETE (run 7, 2026-09-06: rebase-only re-verify)

`git fetch origin main` found 12 new commits since run 6 (mostly the
`design/enhancements-zeroth-state` and `docs/review-fix-records` merges),
which had flipped PR #132's `mergeable_state` to `dirty`. No new REVIEW
FEEDBACK was present in this file or on the PR (checked comments directly,
still empty). Rebased `routine/core-p3` onto `origin/main` clean except one
mechanical conflict both times it recurred: `design/decisions/README.md`'s
component index, where main's incoming lines (`ViewQuote` retired per ADR
0037, plus new `TabBar`/`ActionDock` entries) collided with this branch's
own additions (`ShareCounterCard`, then `PickOneSheet`/`BreakHabitSheet`).
Resolved by keeping the union of both sides' entries each time, nothing
dropped. Ran a full `npm install` first (fresh container, and this branch's
own commits change `package.json`), then `npx tsc --noEmit` clean and
`npm test`: 105 suites / 1132 tests green (up from 103/1106; the extra
count is main's own new tests pulled in by the rebase, not new code from
this run). Force-with-lease pushed the rebased branch. No PLAN.md item was
reopened; nothing code-shaped remains here per run 6's assessment, still
true. PR #132 stays ready for review; the decision queue below is
unchanged from run 6.

## COMPLETE (run 6, 2026-09-05)

`git fetch origin main` showed no new commits since run 5 (branch already
even with `origin/main`, 7 commits ahead, no rebase needed). No new REVIEW
FEEDBACK was appended to this file or to PR #132 since run 5's fixes
(checked the PR's comment list directly: empty). Re-verified from a clean
`npm install`: `npx tsc --noEmit` clean, `npm test` 103 suites / 1106 tests
green, exactly matching run 5's ending count (no regression, nothing new
to add since every checklist item was already `[x]`/`(C)` before this run).

PLAN.md's P3/P4 checklist is fully `[x]` or `(C)` (Charen-only actions).
Nothing code-shaped remains that this routine can reach without a website
repo checkout or a Charen-gated external account. Marking PR #132 ready
for review per the routine's own completion instructions.

**Decision queue Charen must clear (all carried from runs 1-5, none new):**

1. App Store privacy label: review `docs/legal/app-store-privacy-labels.md`
   in full, accept or override its one judgment call (section 3: bucketed
   spend amounts under "Financial Info" vs "Usage Data"; recommendation
   stands: "Usage Data"), and resolve the one open verification (section 4
   item 3: PostHog's IP-handling default). Then transcribe into App Store
   Connect. Not code; nothing to merge for this specifically.
2. RevenueCat dashboard entitlement name must match
   `EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID` (defaults to `'premium'`).
3. When to actually build and test the live RevenueCat client (needs a
   real device build; still mock-mode by default, no go-live date picked).
4. A real device pass for the share card once a native build exists:
   confirm the captured PNG and that the OS share sheet receives a usable
   image on both iOS and Android.
5. The live-path entitlement-reactivity wiring (customerInfo update
   listener repainting a mounted screen) is code-reviewable but not
   unit-testable in this sandbox (documented under Blockers below). Worth
   a manual check once RevenueCat activation gets a real device build.
6. Informational, not a decision: this branch adds `react-native-purchases`
   (RevenueCat) as a second env-gated exception to the CLAUDE.md "no
   network calls in app source" rule, alongside PostHog. Same shape (gated
   on an env key, inert by default, zero network calls unless the key is
   set) but the locked rule's wording still names PostHog as "the single
   sanctioned exception." Worth a CLAUDE.md wording amendment when this
   PR is reviewed. PR #132 sits behind the payments human gate regardless
   of CI state either way (pricing/payments is always Lane 2, ADR
   unchanged).

Standing blockers (unchanged from runs 1-5, none block this routine's own
work, listed so a reviewer has them in one place):
- No website repo access, so P3-3/P3-4/P3-5 cannot be verified or advanced
  here.
- Live RevenueCat end-to-end verification (a real sandbox purchase) needs
  a real device build.
- The share card's capture-and-share path has no real-device pass.
- The live-path reactivity wiring (customerInfo update listener) is
  code-reviewable but not unit-testable in this sandbox: this project's
  Jest/Babel setup cannot execute a real dynamic
  `import('react-native-purchases')` at all (confirmed by hand with a
  throwaway probe test), so no test here can distinguish "wired
  correctly" from "wired but silently broken" for that one listener path.

## Status (run 5, 2026-09-05)

`git fetch origin main` showed no new commits since run 4 (branch already
even with `origin/main`, no rebase needed). This run addressed the
orchestrator's REVIEW FEEDBACK below, which run 4's session had recorded
into this file but had not actually applied to code (the commit that added
the REVIEW FEEDBACK section touched only `docs/routines/HANDOFF.md`, no
source files). All three items are now fixed in commit on this branch; see
Completed. `npx tsc --noEmit` clean. `npm test`: 103 suites / 1106 tests
green (up from 103/1104; +2 new tests). PLAN.md's checklist itself is
unchanged by this run (it was already fully `[x]`/`(C)` before this fix).

## Prior status (run 4)

Run 4 of the `routine/core-p3` branch. `git fetch origin main` showed no new
commits since run 3 (branch already up to date, 3 commits ahead of
`origin/main`), so no rebase was needed. No REVIEW FEEDBACK section was
present in run 3's HANDOFF. `node_modules` did not exist in this checkout
(fresh container); `npm install` ran first, then the baseline was verified
clean: `npx tsc --noEmit` clean, `npm test` 102 suites / 1093 tests green
(matches run 3's own ending count exactly). This run went straight to
PLAN.md's queued item: the two structural entitlement gaps filed 2026-08-11
and reconfirmed still-deferred at the end of run 3.

## Completed (run 5)

Fixed all three items from the REVIEW FEEDBACK section below, in
`9a0d3d7`:

1. **Retryable `initPurchases()`.** The old code set
   `purchasesInitialized = true` in a `finally` regardless of outcome, so
   one failed boot-time init locked every later `purchase()`/`restore()`
   into "did not initialize" for the rest of the app session, even after
   the network came back. On the catch path this now leaves
   `purchasesInitialized` false and clears `purchasesInitPromise` to
   `null`, so the next call re-attempts `import()`/`configure()`/
   `getCustomerInfo()` from scratch. `client.isConfigured()` guards
   against calling `configure()` a second time if the SDK actually came
   up but failed later (e.g. `getCustomerInfo()` threw). New test-only
   `__isPurchasesInitializedForTests()` plus a test in
   `__tests__/purchases.test.ts` asserting the flag is false after a
   failed `purchase()` call. Note: this project's Jest/Babel setup can't
   execute a real dynamic `import('react-native-purchases')` at all (it
   throws the same `--experimental-vm-modules` TypeError every time,
   confirmed by hand with a throwaway probe test), so a black-box
   call/response check can't distinguish "retryable" from "permanently
   stuck" (both look like the same repeated failure). The internal flag
   is the only thing that actually proves the fix; that's why the new
   exported getter exists rather than trying to fake a successful retry.
2. **DST day-math undercount.** `utils/shareCard.ts` now uses
   `Math.round(spanMs / MS_PER_DAY) + 1` instead of `Math.floor(...) + 1`.
   A span crossing a spring-forward transition is n*24h minus 1h, which
   `Math.floor` reads as one whole day short; `Math.round` absorbs the
   one-hour drift (and the symmetric fall-back gain) without changing any
   non-DST result, since those spans are always exact day multiples. New
   test in `__tests__/shareCard.test.ts` sets `process.env.TZ =
   'America/New_York'` for the 2026-03-08 transition (confirmed by hand
   that Node's Date respects a runtime `process.env.TZ` reassignment) and
   restores the original `TZ` afterward.
3. **Doc nit.** `components/ShareCounterCard.tsx`'s header now says the
   card renders on-screen, matching `app/share-card.tsx` (which was
   already correct: the card is mounted and visible, captured live, never
   hidden off-screen).

`npx tsc --noEmit` clean. `npm test`: 103 suites / 1106 tests green (up
from 103/1104; +2 new tests, zero regressions).

## Completed (run 4)

- **Non-reactive entitlement reads, fixed.** `utils/purchases.ts` gained a
  listener set (`entitlementListeners`, `subscribeToEntitlementChanges`) and a
  `notifyEntitlementChanged()` call at every point that actually changes
  `mockEntitlement` or `liveEntitlement`: `writeMockEntitlement` (covers
  `setMockEntitlement`, `resetMockEntitlement`, and the mock `purchase()`
  path), `hydrateEntitlement`'s mock branch (covers mock `restore()`),
  `purchaseLive`, `restoreLive`, and `initPurchases`'s initial
  `getCustomerInfo()` fetch plus its `addCustomerInfoUpdateListener` callback
  (the actual point of this fix: a renewal or a purchase completed elsewhere
  now propagates). A new `useEntitlement()` hook
  (`useSyncExternalStore(subscribeToEntitlementChanges, getEntitlement,
  getEntitlement)`) is the reactive read for components.
  `getEntitlement()` itself is untouched, still synchronous, still the right
  call for `utils/devMenu.ts` or any one-off non-component read.
  All 5 gate call sites switched from a one-shot `getEntitlement()` to
  `useEntitlement()`: `app/(tabs)/index.tsx`, `app/(tabs)/money.tsx`,
  `app/(tabs)/insights.tsx`, `app/habit/[id].tsx`,
  `components/leak-scan/useTrackLeak.tsx`. `components/dev/DevMenuSection.tsx`
  (the dev-menu entitlement toggle, the only other reader) switched from its
  own local `useState` mirror plus a manual `setEntitlement(next)` call to the
  same `useEntitlement()` hook, which both simplifies it (one source of truth
  instead of two) and means toggling entitlement there now repaints every
  other mounted gate immediately, which is the whole bug this fixes.
- **Gated-sheet copy not distinguishing an at-ceiling premium user, fixed.**
  `PickOneSheet` and `BreakHabitSheet` both gained an optional
  `entitlement?: Entitlement` prop. PickOneSheet's header comment says "PROPS
  ARE FROZEN"; this grows the signature by addition only (every existing call
  site that omits the prop keeps the exact free-tier pitch it always
  rendered), never breaks it. When `freeTierBlocked` is true and
  `entitlement === 'premium'`, the gated block now renders distinct honest
  copy: `strings.habitLogging.ceilingNote` / `ceilingTitle` / `ceilingBody` /
  `ceilingDismiss` (new strings, `constants/strings.ts`), no price line, no
  `plannedBanner` honesty note (nobody is being asked to pay), and a single
  dismiss button instead of an upgrade CTA + "Maybe later" (there is nothing
  left to sell a paying user). Free/omitted `entitlement` is unchanged. All 6
  sheet mounts across the 5 gate call sites now pass the resolved
  `entitlement` value through as a prop, alongside the existing
  `freeTierBlocked`.
- **Tests.** `__tests__/purchases.test.ts` gained an `entitlement reactivity`
  describe block: `subscribeToEntitlementChanges` fires on a mock
  purchase/`resetMockEntitlement`/`setMockEntitlement` and stops firing once
  unsubscribed; `useEntitlement()` re-renders (via `renderHook` +
  `act`) when the mock grant changes. `__tests__/pickOneSheet.test.tsx` gained
  a `PickOneSheet gated (premium at ceiling)` describe block (3 tests: shows
  ceiling copy and drops the price/upgrade CTA, dismisses without ever calling
  `onStartTrial`, still shows the free-tier pitch when entitlement is
  free/omitted). `__tests__/breakHabitSheetGate.test.tsx` is new:
  BreakHabitSheet had zero test coverage of any kind before this run;
  deliberately scoped to just the gated state (both branches) rather than
  building out the full ungated chip/amount/cadence flow's coverage, which is
  a separate, larger unit of work and not part of this backlog item.
  `npx tsc --noEmit` clean. `npm test`: 103 suites / 1104 tests green (up from
  102/1093; +11 new, zero regressions).
- **Design decisions.** Added `design/decisions/components/PickOneSheet.md`
  and `BreakHabitSheet.md` (both were undocumented despite being
  decision-bearing components; the README's own rule is "add a file when you
  first make a decision about a component"), indexed in
  `design/decisions/README.md`.
- Considered and left alone: the live-path `notifyEntitlementChanged()` calls
  in `purchaseLive`/`restoreLive`/`initPurchases`'s
  `addCustomerInfoUpdateListener` callback are wired but not directly
  exercised by a test, because this sandbox's Jest/Babel config cannot run a
  real dynamic `import('react-native-purchases')` (the same documented
  constraint run 2's live-client tests already work around by testing the
  injected-client seam and the init-failure path instead, never the real
  dynamic import itself). Not a gap introduced this run; the mock-mode
  reactivity tests exercise the identical `notifyEntitlementChanged()` call
  sites through the reachable path.

## Next

REVIEW FEEDBACK below is now addressed (run 5) but not yet re-reviewed by
the orchestrator. Next run:
1. Address any NEW REVIEW FEEDBACK below first, if the orchestrator has
   appended one since run 5.
2. If none, re-verify (rebase onto `origin/main`, `npx tsc --noEmit`,
   `npm test`), then write COMPLETE at the top of this file and mark the
   draft PR ready for review, per the routine's own instructions. PLAN.md's
   checklist is fully `[x]`/`(C)` and nothing code-shaped remains that this
   routine can reach without a website-repo checkout or a Charen-gated
   external account, so COMPLETE is the expected outcome once run 5's fixes
   clear review.

## Blockers

None for this run's own work. Standing blockers, unchanged from runs 1-3:
- No website repo access, so P3-3/P3-4/P3-5 cannot be verified or advanced
  here.
- Live RevenueCat end-to-end verification (a real sandbox purchase) needs a
  real device build.
- The share card's capture-and-share path (run 3) still has no real-device
  pass.
- **New this run:** the live-path reactivity wiring (customerInfo update
  listener notifying mounted screens) is code-reviewable but not unit-testable
  in this sandbox, for the reason given above under Completed. Worth a manual
  check once RevenueCat activation gets a real device build: trigger a
  renewal or a second-device purchase and confirm an already-open habit
  detail screen's gate updates without navigating away and back.

## DECISIONS NEEDED (for Charen)

1. **Carried over from runs 1-3, still open.** App Store privacy label:
   review `docs/legal/app-store-privacy-labels.md` in full, accept or
   override its one judgment call (section 3: bucketed spend amounts under
   "Financial Info" vs "Usage Data"; recommendation stands: "Usage Data"),
   and resolve the one open verification (section 4 item 3: PostHog's
   IP-handling default). Then transcribe into App Store Connect. Not code;
   nothing to merge for this specifically.
2. **Carried over from run 2, still open.** RevenueCat dashboard entitlement
   name must match `EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID` (defaults to
   `'premium'`).
3. **Carried over from run 2, still open.** When to actually build and test
   the live RevenueCat client (needs a real device build).
4. **Carried over from run 3, still open.** A real device pass for the share
   card once a native build exists: confirm the captured PNG and that the OS
   share sheet receives a usable image on both iOS and Android.
5. **New this run, not blocking, informational.** No pricing, product id, or
   legal wording positions were touched. No mock-mode default was flipped.
   The new `ceilingNote`/`ceilingTitle`/`ceilingBody`/`ceilingDismiss` copy
   (constants/strings.ts) is new customer-facing text but not a pricing or
   legal decision: it only ever shows to a premium user who has already hit
   the real 5-habit ceiling, stating a fact about the product's own limit,
   not a price or a legal position. Flagging so it is visible, not asking for
   a decision.

## REVIEW FEEDBACK

2026-09-08, orchestrator, runs 12-14 reviewed (through 82156c2).
**Approved, no fixes owed.** The run 13 rebase resolutions were
independently verified against main: the LeakFinderTeaser.md three-way
merge kept both sides' Decisions entries newest-first, correctly
dropped main's stale "cannot be granted" bullet (written before this
branch's grant existed), and preserved the grant-timing open item; the
AnalyticsEventMap union kept both structural events, and both are
additive and payload-free. Runs 12 and 14's re-verify claims match
runs.log and the suite counts line up with main's own test growth.
Decision queue items 2-4 and 7 stay with Charen; the promo-mechanism
ADR stays deferred until decision 7 is answered, as agreed.

**Status: re-reviewed and closed, 2026-09-06 (orchestrator).** All three
fixes verified against the diff (now `272c870` post-rebase): the retryable
init leaves the flag false and clears the in-flight promise on failure
with `isConfigured()` correctly awaited on the retry guard, the DST
Math.round fix and its America/New_York test are right, and the doc nit is
aligned. The `__isPurchasesInitializedForTests()` rationale (the sandbox
cannot execute the dynamic import, so the flag is the only observable) is
accepted and well argued. Nothing further owed on this feedback; PR #132
standing ready for review is correct.

One rebase note, no action needed until your next run: main moved again
after run 7's rebase (PRs #142-#146). Your branch overlaps main's new
commits on `app/(tabs)/index.tsx`, `insights.tsx`, `money.tsx` (your
entitlement-gate call sites vs main's segment-pager refactor),
`constants/strings.ts`, and `utils/analytics.ts` (both sides add events).
PR #132 is likely `dirty` again; same mechanical rebase as run 7, keep the
union in analytics event lists and re-run the suite.

2026-09-05, orchestrator, runs 1-4 reviewed (d1d2cf1..4e79863). Strong

2026-09-05, orchestrator, runs 1-4 reviewed (d1d2cf1..4e79863). Strong
work: catching and fixing the impl-null fallback that silently granted mock
premium on a live init failure was a real save, and the useSyncExternalStore
reactivity fix is the right shape. Three items to fix next run, before
marking PR #132 ready for review:

1. `initPurchases()` failure is permanent for the session. The catch
   leaves `impl` null and the finally sets `purchasesInitialized = true`,
   so one failed boot-time init (offline at launch, a transient RevenueCat
   outage) makes every later `purchase()`/`restore()` report "did not
   initialize" until the app relaunches, even after the network returns.
   Make a failed init retryable: on the catch path, clear
   `purchasesInitPromise` and leave `purchasesInitialized` false, guarding
   against calling `configure()` twice on retry (the SDK's
   `Purchases.isConfigured()`, or a local configured flag). Cover the
   retry via the injectable seam plus `__resetPurchasesInitForTests`, same
   as the existing init-failure test.
2. `utils/shareCard.ts` day math undercounts across spring-forward DST:
   the midnight-to-midnight diff over such a span is n*24h minus 1h, and
   `Math.floor` then yields n-1, so the card can claim one fewer day than
   the real span. `Math.round(spanMs / MS_PER_DAY) + 1` fixes it; add a
   DST test case with explicit dates (the suite runs under a fixed TZ, so
   pick one that crosses a US or EU transition).
3. Doc nit: `components/ShareCounterCard.tsx`'s header says it "renders
   off-screen for a view-shot capture"; `app/share-card.tsx` correctly
   says it renders on-screen (mounted and visible). Align both on
   on-screen.

Not yours to fix, tracked on the status board for Charen: the CLAUDE.md
locked rule still names PostHog "the single sanctioned exception" to
no-network, and this branch makes RevenueCat a second env-gated exception;
that amendment is queued as a decision, and PR #132 sits behind the
payments human gate regardless of CI state. Worth one line in the PR body
when you mark it ready, so a reviewer sees both flags.

2026-09-07, orchestrator, runs 8 to 11 reviewed (6530d22..0476e9c).
**Approved, no fixes owed.** The dated promo grant is well built: the
layered composition (never masking a real purchase), the idempotence
guard, the boot plus fresh-tap wiring, and the test set (dormant flag,
no opt-in, six-month expiry math, never re-extends, expired falls
through, stacking, hydration, corrupt record) all check out against the
diff.

One informational note, nothing owed: a grant expiring mid-session does
not fire notifyEntitlementChanged at the expiry instant, so
useEntitlement subscribers keep reporting premium until the next
render or relaunch. At a six-month horizon this is negligible; recorded
here so it is a known edge, not a surprise.

The clock-start question (unlock vs opt-in tap) you flagged is now on
the status board's DECISIONS NEEDED for Charen; do not decide it
yourself. The mechanism ADR will be drafted by the orchestrator once
that answer lands, so it records the final shape.

## REVIEW FEEDBACK (2026-09-11 addition)

2026-09-11, orchestrator, runs 15-25 reviewed (through badc0ab; runs
15-23 docs-only re-verifies, run 24 a clean rebase, run 25 the real
one). **Approved, no fixes owed.** Run 25's three conflict
resolutions were independently verified by diffing this branch
against its merge-base 9376cc2: in both PickOneSheet.tsx and
BreakHabitSheet.tsx the `atCeiling` conditional now lives on the new
`footer` prop (single Done-style dismiss at the ceiling, upgrade +
maybe-later pair otherwise), the gated-copy ternaries survived in the
body, the plannedBanner is correctly suppressed at the ceiling, and no
dead in-body button block remains. The BreakHabitSheet.md add/add
resolution (main's redesign doc as base, this branch's entitlement
entry folded in as a dated addition) is the right shape.

Rebase guidance for the next run: main gained the four QA merges
after run 25 (#161-#164, main now 683ecc3). Crossings with this
branch are mild but real: `constants/strings.ts` (+6 QA keys next to
your +24), `app/(tabs)/index.tsx` and `app/(tabs)/insights.tsx`
(small on your side, larger on theirs), and `contexts/HabitsContext.tsx`
(QA's Kept-dot state; you touch its consumers, not the file, so
likely clean). `utils/analytics.ts` was NOT touched by the QA wave
despite FL-1 being an analytics fix (it landed in coachMoments/
HabitsContext), so your event additions should replay clean. Note
`docs/qa-findings.md` is new on main; leave it alone.
