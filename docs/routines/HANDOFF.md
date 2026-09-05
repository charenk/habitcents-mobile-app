# ipad-worker handoff

## Status

In progress. Run 4 of the routine. Rebased cleanly onto origin/main (no new
commits there since run 3; nothing to resolve). `npm install` was needed
again at the start of this run (fresh container, `node_modules` not
present, same as runs 1-3). tsc clean, full test suite green (100 suites,
1081 tests, no flake this run). No simulator or device in this
environment, so nothing in this run has been eyeballed on an actual iPad;
see DEVICE PASS NEEDED below, unchanged in substance from runs 1-3 (one
line added for this run's changes).

## Completed

- Runs 1-3: plan items 1, 2a, 2b, 2c, 2d, 3, and a first pass at 6. See
  PLAN.md for detail; unchanged this run.
- Run 4, plan item 2e (the Today Kept pane's header chrome): capped the
  door3 ribbon and `KeptHero`, the two elements that render directly in the
  Kept pane above and outside the ScrollView/SectionList content items
  2b/2d already capped. Re-checked the item's original wording first: "the
  kept quote" turned out to already be inside `keptEmptyContent`'s
  ScrollView (capped by item 2d already), not a real gap, so only the
  ribbon and the hero needed work.
  - `ribbonWrap` uses `paddingHorizontal`, so it took the same direct
    `...contentColumnStyle` spread as `listContent`/`keptEmptyContent`, no
    conflict.
  - `keptHeroGutter` uses `marginHorizontal` and merges directly onto
    `KeptHero`'s own `card` root (which carries `card`'s background, via
    `style={[styles.card, style]}` in KeptHero.tsx). Spreading
    `contentColumnStyle` straight into it would size that background box
    to 100% of the pane BEFORE margin is added outside it, pushing the
    card past the 600pt cap by `2 * spacing.gutter` on iPad. Fixed with a
    new wrapping View, `keptHeroCapWrap`, around `<KeptHero>` instead: the
    wrapper caps and centers at 600pt first, and `keptHeroGutter`'s margin
    then insets `KeptHero` within that already-capped width, same as it
    insets within the full screen width on phones today. Below the cap the
    wrapper is a pass-through, so phone rendering is unchanged. This is the
    same shape as item 2c's `beatContent` wrapper (new wrapper View, not a
    style spread, because the existing style couldn't safely take the
    spread directly).
  - Added `testID`s (`door3-ribbon-wrap`, `kept-hero-cap-wrap`) to both new/
    touched wrappers for the item 6 tests below.
- Run 4, plan item 4 (the Today pager's `screenWidth`-driven width math):
  investigated, resolved with no code change beyond item 2e. This is the
  same shape as `OnboardingCarousel`'s `beat`/`beatContent` split (item
  2c): the paging unit (`pane`) has to stay window width because
  `handlePagerMomentumEnd`'s offset math divides by that same width, so the
  fix is capping the content inside the page, never the page itself. Every
  content path inside both panes is now capped (Spent: `spentScrollContent`;
  Kept: `keptEmptyContent`, `listContent`, and this run's `keptHeroCapWrap`/
  `ribbonWrap`). Also confirmed `useWindowDimensions()`'s width reliably
  matches the pager's own rendered frame width on iOS, including in iPad
  Split View / Slide Over (it reflects the app's actual window bounds, not
  the full device screen), so there is no real divergence for an on-layout
  measured width to fix.
- Run 4, plan item 6: extended `__tests__/todayQuoteRibbonPlacement.test.tsx`
  (not `tabletLayout.test.tsx`, which lacks the Habits/Expenses/Categories/
  Onboarding provider mocks this needs) with three cases: `kept-hero-cap-
  wrap` carries the cap, `door3-ribbon-wrap` carries the cap, and
  `kept-pane` itself does not (pins the item 4 invariant).

## Next

Per PLAN.md, in order:
1. Item 5: the `useWindowDimensions` audit (list already gathered in
   PLAN.md item 5), now unblocked since items 2 and 4 both landed. Also
   carries the fixed-footer cap question from item 2d/run 3 (see DECISIONS
   NEEDED below).
2. Item 6: extend tablet jest coverage further as item 5's audit lands (a
   real structural change, like items 2c/2e before it, is more likely to be
   worth a dedicated test than a mechanical style spread).
3. Once item 5 is done: re-read PLAN.md top to bottom to confirm every
   item is checked before touching the COMPLETE / device-pass-ready state
   this file's own header describes.

## Blockers

None currently. `npm install` was needed again at the start of this run
(fresh container, `node_modules` not present); expected, not a real
blocker, same as runs 1-3.

## DECISIONS NEEDED

- Whether the fixed footer/CTA bars outside a capped ScrollView (
  `ScopeScreen`, `BillsScreen`, `app/paywall.tsx`, `PayoffScreen`'s Continue
  button) should get the same 600pt cap on iPad, or are meant to stay full
  width by design. Flagged for the item 5 audit pass rather than decided in
  this or any prior run; carried over unchanged from run 3's handoff.
- No new decisions raised this run. Item 4's pager investigation
  (see Completed above) concluded with no visible behavior change, so the
  Lane 2 flag run 3 raised for a possible pager behavior change did not
  come up; nothing to raise here for it.

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
