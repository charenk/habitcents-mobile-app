# ipad-worker handoff

## Status

In progress, now genuinely idle. Run 11 of the routine. This is the exact
scenario run 10 flagged in advance: `origin/main`'s tip has still not
moved since run 8 (both `routine/ipad` and `origin/main` remain at
`a51ce4a`, reconfirmed with
`git merge-base --is-ancestor origin/main routine/ipad`), so no rebase was
needed; the footer-cap decision on issue #139 is still unanswered
(reconfirmed with `get_comments`, not just the cached issue body: zero
comments); and there is nothing left to re-verify that has not already
been re-verified twice (runs 9 and 10). Confirmed the branch is still
green from a clean install (`npm install` needed again, fresh container,
as every run): `npx tsc --noEmit` clean, full suite 106 suites / 1130
tests passing, the same counts as runs 8, 9 and 10, so zero drift across
four straight runs. Checked PR #133: still draft, base SHA matches current
main's tip exactly (`mergeable_state: clean`). Re-verified item 7
unchanged (`app.json` still `"orientation": "portrait"`,
`"supportsTablet": true`). Also read issue #139 in full (not just its
comment count): it is the orchestrator's "Routine status board" post,
carrying six DECISIONS NEEDED items across three streams, not a
footer-cap-only thread; the footer-cap question is item 1 there. No
production code or plan content changed this run. Per run 10's own
instruction, this run names the idle stream explicitly instead of quietly
logging another bare "ok" (see Blockers and DECISIONS NEEDED below) and
sent one push notification to Charen, since this routine has never sent
one directly itself: the only prior notification on this decision came
from the orchestrator's 2026-09-06 board update, and the point of a
scheduled routine is to surface exactly this kind of stuck-on-a-person
situation rather than let it scroll by silently for a further, unbounded
number of runs.

## Completed

- Runs 1-4: plan items 1, 2 (all of a-e), 3, 4, and a first pass at 6. See
  PLAN.md for detail; unchanged this run.
- Run 5, REVIEW FEEDBACK (addressed first, per this file's own instruction):
  the orchestrator's 2026-09-05 review of runs 1-4 found the layout work
  itself sound but flagged that design decision records had not been
  updated alongside it, per `design/decisions/README.md`'s same-commit
  rule. Added, in one docs-only commit:
  - `design/decisions/components/Sheet.md`: dated line for the 600pt panel
    cap and centering, and why phones are unaffected.
  - `design/decisions/modules/today.md`: dated line for the pane content
    caps (all five paths) and the item 4 conclusion that the pager's paging
    unit stays window width by design.
  - `design/decisions/components/OnboardingCarousel.md`: new file, first
    recorded decision for this component (the `beat`/`beatContent` split
    and why `beat` must stay window width), and added to the
    `design/decisions/README.md` index.
  - `design/PATTERN_VOCABULARY.md` Surfaces section: added the readable
    column rule (cap via `contentColumnStyle` spread at the call site;
    reach for a wrapping View only when the target style merges margin onto
    a background-carrying root; paging units are never capped).
  No code changed in this commit; tsc and the full suite were still run and
  are green, per the standing rule.
- Run 5, plan item 5 (the `useWindowDimensions` audit): done, no code
  change needed anywhere. Re-grepped the repo (19 files matched; docs/plan/
  test files and the two already-resolved sites, `app/(tabs)/index.tsx`
  (item 4) and `OnboardingCarousel.tsx` (item 2c), set aside, leaving 7 real
  sites plus the two already-known non-issues):
  - `AddCategoryModal`, `PartialSlipSheet`, `AddUpcomingSheet`,
    `ExpenseSheet`, `BreakHabitSheet`, `CategoryTransactionsSheet`,
    `ReviewQueueSheet`, `PickOneSheet` all read `height` only (never
    `width`), for a `maxHeight: height * 0.82` or `* 0.86` keyboard-clearing
    cap on the sheet body. That is orientation- and device-size-agnostic
    math; it does not interact with `Sheet`'s width cap (item 3) and needed
    no change.
  - `AuroraBackground.tsx` reads `width` to size a full-bleed gradient, but
    confirmed (grep for its import) that it renders nowhere in the app: it
    is unreferenced dead code, the retired welcome screen's documented
    revert path per `PATTERN_VOCABULARY.md`. No live tablet surface to fix.
  - `CheckInCard.tsx` reads `fontScale`, confirmed out of this plan's scope
    (Dynamic Type, not window sizing).
  Did not decide the fixed-footer cap question as part of this audit, per
  the review feedback below (it is on the ops status board for Charen now).
- Run 6: no plan work was actionable. Rebase was a no-op, no new REVIEW
  FEEDBACK was present, and item 6 (the only unchecked line besides the
  standing item 7 re-verification) stays blocked on the footer-cap
  decision, confirmed still unanswered on `#139` (see DECISIONS NEEDED).
  Re-ran tsc and the full suite to confirm the branch is still green with
  zero drift; both are unchanged from run 5. Re-verified item 7 (`app.json`
  orientation still `"portrait"`).
- Run 7: rebased onto 12 new main commits (zero-state art, ActionDock/dock
  unification, tab-selection and toast fixes, design record catch-up),
  resolving a real conflict in `app/(tabs)/index.tsx` (import line plus
  three `paddingBottom` sites) and two docs files
  (`design/decisions/README.md`, `design/decisions/modules/today.md`)
  exactly per the resolution guidance run 5 had left recorded in
  today.md's Open section; that note is now removed since this run is the
  merge it was written for. No plan item's code changed (nothing new was
  unblocked by main's incoming work), but re-audited rather than assumed:
  re-grepped for `useWindowDimensions` (still the same 7 real sites, none
  new) and re-checked that every scroll container main touched still
  carries `contentColumnStyle` where item 2 put it, and that the item 2e
  wrappers (`door3-ribbon-wrap`, `kept-hero-cap-wrap`) survived the
  ActionDock/zero-state rework around them. Confirmed item 6 still
  soft-blocked: `#139` still open, zero comments. Re-verified item 7.
- Run 8: rebased onto 5 new main commits (PR #143's segment-pager wave,
  PRs #142/#145's leak-finder gating, the #146 navigation-wave merge).
  Unlike runs 5-7, the conflicts landed on two of this branch's own
  historical commits during replay, not just the tip: run 1's original
  commit (pure import-list conflicts in `index.tsx`/`insights.tsx` from
  main's new `useSegmentPager`/`hapticError` imports landing on the same
  line as this branch's `contentColumnStyle` import) and run 5's
  design-record commit (`README.md`/`today.md` index and Iterations
  entries, resolved by union as before). Re-audited after the rebase
  rather than trusting it was clean, per the orchestrator's instruction,
  and found a real regression this time, not just a clean pass: main's
  same-day extraction of Money's Spent pane into
  `components/money/SpentList.tsx` dropped the tablet cap that pane's
  content had carried since item 2b, because the new file's `listContent`
  style was rebuilt without carrying `contentColumnStyle` over. Fixed,
  documented in `design/decisions/modules/money.md` (checked
  `SegmentPager.md` first; the fix belongs in the per-surface module file,
  not the pager-mechanism file), and pinned with a new jest case in
  `__tests__/spentList.test.tsx` (added a `testID` to `SpentList`'s
  `SectionList` for the query). Today's and Insights' panes were not
  extracted by that same refactor; confirmed by direct reading, not
  assumed. Checked `#139` again for the footer-cap decision: still open,
  zero comments. tsc clean, full suite green (106 suites, 1130 tests, up
  from 106/1129 from this run's one new test).
- Run 9: no plan work was actionable beyond bookkeeping. `origin/main` had
  not moved since run 8 (both branches already at the same tip commit
  before this run started), so there was nothing to rebase and no new
  regression surface to re-audit; run 8's `SpentList` fix already covers
  everything currently on main. Re-ran tsc and the full suite from a clean
  install to confirm the branch is still green with zero drift from run 8
  (106 suites / 1130 tests, matching exactly). Re-checked `#139`: still
  open, zero comments, now idle 4 runs. Re-checked PR #133: still draft,
  base SHA matches current main's tip exactly, latest commit's CI check
  green. Re-verified item 7 (`app.json` orientation still `"portrait"`,
  `supportsTablet` still `true`). Marked PLAN.md's item 2 parent checkbox
  complete: its five sub-items (2a-2e) have all been done since run 5, and
  the parent line had simply never been checked off; the fixed-footer gap
  it might be confused with is item 6's scope, not item 2's, so this is a
  pure bookkeeping fix with no behavior change.
- Run 10: no plan work was actionable and no bookkeeping gap remained
  (run 9 already closed the one that existed). `origin/main` had still not
  moved since run 8, confirmed the same way as run 9
  (`git merge-base --is-ancestor origin/main routine/ipad`), so there was
  nothing to rebase and no new regression surface. Re-ran tsc and the full
  suite from a clean install: still green, 106 suites / 1130 tests, zero
  drift from runs 8 and 9. Re-checked `#139` via `get_comments` (not just
  the cached issue body, to rule out a comment landing without updating
  the body): still zero comments, now idle 5 runs. Re-checked PR #133:
  still draft, base SHA matches current main's tip exactly. Re-verified
  item 7 (`app.json` orientation still `"portrait"`, `supportsTablet`
  still `true`). This HANDOFF update is the only change this run.
- Run 11: same shape as run 10, confirmed the same way (`git merge-base
  --is-ancestor origin/main routine/ipad`; `get_comments` on `#139`; PR
  #133 base SHA against main's tip). `origin/main` still has not moved
  since run 8 (four runs now with zero drift: 106 suites / 1130 tests,
  tsc clean, matching runs 8, 9 and 10 exactly). Issue #139 is still
  unanswered, zero comments, now idle 6 runs since run 5 first surfaced it
  on the board. Item 7 re-verified unchanged. Per run 10's own Blockers
  note, this is the point to stop quietly repeating "ok": named the idle
  stream explicitly below and sent one push notification to Charen
  directly from this run, since no prior ipad-worker run has sent one
  itself (the one prior notification, 2026-09-06, came from the
  orchestrator's board update, not this routine). This HANDOFF update is
  the only change this run; no production code or plan content changed.

## Next

Per PLAN.md, in order:
1. Item 6: still the only unchecked plan line, still blocked on Charen's
   footer-cap decision (see DECISIONS NEEDED), now idle 6 runs with zero
   comments on `#139`. A push notification went out this run; if the next
   run still finds it unanswered, do not send a second one immediately
   (avoid notification fatigue on a one-line ask already surfaced twice,
   once by the orchestrator and once by this run) but do keep naming the
   idle count in Status/Blockers so it stays visible. Revisit the actual
   test work once it lands: if it adds a cap to
   `ScopeScreen`/`BillsScreen`/paywall/`PayoffScreen`, that is a real
   structural change and, like items 2c/2e/run 8 before it, likely earns a
   dedicated test case.
2. Item 7: re-verify `app.json`'s `"orientation": "portrait"` stays
   untouched (confirmed unchanged this run; keep checking every run).
3. Every run, check first whether `origin/main` has moved at all before
   deciding how much re-audit is owed. When it has, re-audit (not just
   re-run) against the new commits: grep `useWindowDimensions` fresh and
   check any scroll container main touched still carries
   `contentColumnStyle`. Run 8 is the proof this matters: a clean rebase
   was not proof nothing regressed, since main had quietly dropped a cap
   in a file this branch had never seen before. Run 9 is the other half of
   that judgment call: main had not moved at all, so re-running the same
   audit against unchanged commits would have found nothing new and wasted
   the run; confirming that via `git merge-base --is-ancestor` first is
   the way to tell the two cases apart, not skipping the check outright.
4. With items 1, 2, 3, 5 and 7 all satisfied, item 6 is the only plan line
   not checked off, and it is blocked on a human decision rather than on
   agent work. Do not treat the plan as fully checked or touch the
   COMPLETE state until either that decision lands and its follow-up test
   work is done, or Charen says item 6 can close without it.

## Blockers

None that stop this routine from running; the plan-progress blocker is
real and now explicit. `npm install` was needed again at the start of
this run (fresh container, `node_modules` not present); expected, not a
real blocker, same as every prior run. Item 6 is soft-blocked on Charen's
footer-cap decision (see DECISIONS NEEDED), not on anything this routine
can resolve itself; still open on `#139` with zero comments as of this
run, now idle 6 runs (since run 5 first surfaced it, 2026-09-05). Still
not logged as a runs.log `blocked` outcome: per the retry and failure
policy, that classification is for a routine that cannot proceed at all,
and every run including this one did real, bounded verification work
(rebase conflict resolution and re-audit when main moved in runs 1-4 and
7-8; a plan bookkeeping fix on run 9; a clean-install tsc/test
re-verification with zero drift on runs 9, 10 and 11). But four straight
runs (8 through 11) have found zero code work, and the decision is now
idle six runs with no engagement at all (no comment, reaction, or
edit on `#139`), so this run treated that as the trigger run 10 named in
advance: escalated explicitly here and in runs.log instead of repeating a
bare "ok", and sent one push notification directly to Charen (the first
from this routine itself; the only earlier one came from the
orchestrator's 2026-09-06 board update). The decision blocks only item 6;
items 1 through 5 and 7 remain fully done, so the branch itself is not at
risk, only its last checkbox and, downstream, marking the PR ready for
review.

## DECISIONS NEEDED

- **Idle 6 runs, zero engagement: whether the fixed footer/CTA bars
  outside a capped ScrollView (`ScopeScreen`, `BillsScreen`,
  `app/paywall.tsx`, `PayoffScreen`'s Continue button) should get the same
  600pt cap on iPad, or are meant to stay full width by design.** This is
  the single thing standing between this branch and a fully checked plan.
  It was first surfaced on the ops status board (`#139`) by run 5's
  review, 2026-09-05; as of this run (2026-09-07, run 11) it still has
  zero comments, zero reactions, and no edit, confirmed with
  `get_comments` rather than trusting the cached issue body. Per the run 5
  review feedback this routine does not re-raise or decide it itself, so
  the ask stays the same: a one-line comment on `#139` (or wherever Charen
  prefers to answer) either way unblocks item 6's remaining test work.
  Everything else in the plan (items 1-5 and 7) is already done, so
  answering this is the only remaining step before PR #133 can be marked
  ready for review.
- No new decisions raised this run.

## DEVICE PASS NEEDED

Nothing in this branch has been seen on a real iPad or the iPad simulator
(none is available in this environment). Before this ships, a human pass
should check, once the plan is further along (at minimum after items 2, 3
and 4 land in full; all now do, so this list is ready for a first pass
whenever a device is available, ahead of item 5 too if useful):

- The 600pt capped column reads as intentional on iPad, not cramped or
  arbitrarily narrow, across Today, Money, Insights, Categories, habit
  detail, category detail, Profile, Paywall, the onboarding carousel beats,
  and every Leak Scan screen (intake, scope, deck, bills, graceful failure,
  results, payoff).
- Bottom sheets (`components/ui/Sheet.tsx` and everything built on it:
  ExpenseSheet, AddUpcomingSheet, PickOneSheet, PartialSlipSheet,
  BreakHabitSheet, ConfirmSheet, ReviewQueueSheet, CategoryTransactionsSheet,
  the currency and category pickers) look right centered at the capped
  width, including the keyboard-avoiding behavior on forms (ExpenseSheet,
  AddUpcomingSheet) with the iPad on-screen keyboard, which is shaped
  differently from the phone one.
- The onboarding carousel: swiping between beats on iPad, confirming the
  capped `beatContent` column reads well against the still full-width
  `beat` page background, and that `BeatMedia`'s frame (capped along with
  the rest of the beat content) is not so narrow it looks like an error
  state.
- The Leak Scan flow end to end on iPad: intake's file-picker stage,
  scope's category rows, the deck's swipeable candidate cards, the bills
  offer rows, graceful failure, and the results dashboard, all capped at
  600pt; specifically whether the un-capped footer button bars on scope and
  bills (see DECISIONS NEEDED above) look like an intentional full-width
  CTA or an inconsistency against the capped content above them.
- The Today Spent/Kept pager: swiping between Spent and Kept feels right on
  iPad, in both split-view widths, now that the Kept pane's ribbon and
  KeptHero band (this run's item 2e) are capped and centered alongside the
  rest of the pane's content, not just the scrolling list below them; watch
  specifically for any visual seam where the capped ribbon/hero column
  meets the still-full-width pane background above/around it.
- Split-screen / Slide Over multitasking on iPad, since `supportsTablet`
  now being true makes iPadOS offer those; the app has never been exercised
  in a resized window before this branch.
- One boot on an iPad simulator or device to confirm nothing above (icon,
  splash) regressed from turning `supportsTablet` on, before this reaches
  TestFlight.

This app also carries a standing device-pass item from Phase 2 sign-off
(decision 0008, umbrella repo): the VoiceOver walk + Accessibility
Inspector audit, scheduled for the Phase 4 TestFlight beta. This iPad
device pass is separate and additional to that one, not a substitute.

## REVIEW FEEDBACK

2026-09-05, orchestrator, runs 1-4 reviewed (57321e3..963559d). The layout
work is sound: the wrapper-not-container reasoning on `keptHeroCapWrap` and
`beatContent` is correct and well documented in code, and pinning the
pane-stays-window-width invariant in tests was the right call. One
house-rule gap to fix next run, before or alongside item 5:

- Design decision records were not updated with the code
  (design/decisions/README.md requires updating them in the same commit
  that touches a surface). Add, in one commit on this branch:
  - `design/decisions/components/Sheet.md`: one dated line for the 600pt
    cap + centering on the sheet panel and why phones are unaffected.
  - `design/decisions/modules/today.md`: one dated line for the pane
    content caps (spentScrollContent, listContent, keptEmptyContent,
    ribbonWrap, keptHeroCapWrap) and the item 4 conclusion that the
    pager's paging unit stays window width by design.
  - `design/decisions/components/OnboardingCarousel.md`: new file (first
    recorded decision about this component): the beat/beatContent split
    and why the beat itself must stay window width.
  - `design/PATTERN_VOCABULARY.md` (Surfaces section): add the readable
    column rule: scroll content caps at `layout.contentMaxWidth` (600pt)
    via `contentColumnStyle`; use a wrapping View instead of a spread when
    the target style merges margin onto a background-carrying root; paging
    units are never capped, only the content inside them. The pattern
    ships with this branch, so its vocabulary entry belongs in this
    branch, not on main ahead of it.
- The fixed-footer cap question (ScopeScreen, BillsScreen, paywall,
  PayoffScreen Continue) is now on the status board's DECISIONS NEEDED
  queue for Charen; no need to re-raise it, and do not decide it in the
  item 5 audit.

Addressed run 5 (2026-09-05): all four doc updates landed in one commit
before any other run 5 work, per the instruction above. See Completed
above for detail. The footer question was left alone as instructed.

2026-09-06, orchestrator, runs 5-7 reviewed. **Approved, no code fixes.**
The design records and the PATTERN_VOCABULARY.md readable-column entry are
exactly what was owed, the item 5 audit's reasoning (height-only reads,
AuroraBackground dead code, fontScale out of scope) is sound, and the run 7
conflict resolution in `app/(tabs)/index.tsx` was verified correct against
both parents. Two rebase items for next run:

1. Main moved again after your run 7 push: PR #143 extracted the Today
   pager into `utils/useSegmentPager.ts` and gave Money and Insights the
   same segment-swipe treatment, rewriting exactly the three tab screens
   this branch caps (`index.tsx` -141 lines, `insights.tsx`, `money.tsx`)
   plus `constants/theme.ts`, which both sides touch. Expect a heavier
   conflict than run 7's. After rebasing, apply your own run 7 "re-audit,
   not re-run" rule with extra care: each new pager pane on all three
   screens must still cap its scroll content, and the paging unit must
   stay window width (the invariant your tests pin). Main also added
   `design/decisions/components/SegmentPager.md`; if the cap interacts
   with the pager panes, add the dated line there, same-commit rule.
2. PRs #142/#145 wrapped the leak finder as coming soon behind a
   SCAN_FLOW_ENABLED gate. Your Leak Scan caps (item 2d) stay compiled
   and correct; nothing to do, just do not be surprised that the flow is
   dormant when re-auditing.

The footer-cap decision remains with Charen on #139; it has now been
re-surfaced in today's board update and push notification.

Addressed run 8 (2026-09-06): item 1's rebase and re-audit done as
instructed, with the conflicts landing one commit earlier than expected
(run 1's own commit, not just the tip) since main's segment-pager wave
touched the same import lines this branch's very first commit had
touched. The re-audit found a real gap this time (Money's `SpentList.tsx`
extraction dropping the cap, see Status/Completed above), fixed and
tested in one commit. Checked `SegmentPager.md` per item 1's instruction;
concluded the cap doesn't belong there (it documents the pager mechanism,
not per-screen content styling) and put the decision line in `money.md`
instead, matching where Today's own cap decisions already live in
`today.md`. Item 2 (the leak-finder gate) needed no action, confirmed.

2026-09-07, orchestrator, runs 8 to 11 reviewed (f1061f0..3994950).
**Approved, no fixes owed.** Run 8's SpentList catch is exactly what the
post-rebase re-audit discipline exists for: main's pager extraction
dropped the cap silently and a clean rebase would never have shown it.
The jest case pinning contentContainerStyle and the same-commit money.md
record are both right. Runs 9 to 11's idle verification posture is
correct while the footer-cap decision sits with Charen; it has been
re-surfaced on #139 again today.

Coordination notes, no action until a merge or rebase makes them live:

- routine/localization has now converted components/money/SpentList.tsx
  and components/onboarding/OnboardingCarousel.tsx to useStrings() (plus
  a buildBeats(catalog) refactor of BEATS on the carousel). Whichever
  branch crosses the other's merge keeps both changes and re-verifies
  the pair: the 600pt cap survives AND the conversion survives, with the
  carousel's paging unit still window width.
- app/profile.tsx is now touched by all three routine branches (your
  cap, localization's conversion, core's share card row). Keep the union
  when its turn comes.
