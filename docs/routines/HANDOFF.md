# ipad-worker handoff

## Status

In progress. Run 5 of the routine. Branch was already even with
origin/main at rebase time (no new upstream commits since run 4; nothing to
resolve). `npm install` was needed again at the start of this run (fresh
container, `node_modules` not present, same as runs 1-4). tsc clean, full
test suite green (100 suites, 1081 tests) both after the review-feedback
docs commit and again unchanged after the item 5 audit (which made no code
changes). No simulator or device in this environment, so nothing in this
run has been eyeballed on an actual iPad; DEVICE PASS NEEDED below is
unchanged from run 4.

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

## Next

Per PLAN.md, in order:
1. Item 6: no new tablet jest coverage was needed this run, since item 5
   concluded with no code change. Revisit once Charen's footer-cap decision
   (see DECISIONS NEEDED) lands: if it adds a cap to `ScopeScreen`/
   `BillsScreen`/paywall/`PayoffScreen`, that is a real structural change
   and, like items 2c/2e before it, likely earns a dedicated test case.
2. Item 7: re-verify `app.json`'s `"orientation": "portrait"` stays
   untouched (confirmed unchanged this run; keep checking every run).
3. With items 1-5 and 7 all satisfied, item 6 is the only plan line not
   checked off, and it is blocked on a human decision rather than on
   agent work. Do not treat the plan as fully checked or touch the
   COMPLETE state until either that decision lands and its follow-up test
   work is done, or Charen says item 6 can close without it.

## Blockers

None. `npm install` was needed again at the start of this run (fresh
container, `node_modules` not present); expected, not a real blocker, same
as runs 1-4. Item 6 is soft-blocked on Charen's footer-cap decision (see
DECISIONS NEEDED), not on anything this routine can resolve itself; that is
noted here for visibility, not logged as a runs.log `blocked` outcome,
since the routine still made forward progress this run (items 5 and the
review feedback both landed) and has further plan-adjacent work (item 7's
re-verification, watching for the decision) it can keep doing.

## DECISIONS NEEDED

- Whether the fixed footer/CTA bars outside a capped ScrollView (
  `ScopeScreen`, `BillsScreen`, `app/paywall.tsx`, `PayoffScreen`'s Continue
  button) should get the same 600pt cap on iPad, or are meant to stay full
  width by design. Per the run 5 review feedback, this is now on the ops
  status board's DECISIONS NEEDED queue for Charen, not something this
  routine re-raises or decides in item 5 (done this run) or anywhere else.
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
