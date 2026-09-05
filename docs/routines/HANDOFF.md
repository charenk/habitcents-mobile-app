# ipad-worker handoff

## Status

In progress. Run 3 of the routine. Rebased cleanly onto origin/main (no
conflicts). `npm install` was needed again at the start of this run (fresh
container, `node_modules` not present, same as runs 1 and 2). tsc clean,
full test suite green (100 suites, 1078 tests). One test
(`__tests__/habitDetection.test.ts`, "counts every buy in a same-day cluster
and refuses to state a monthly rate") failed once mid-run when the full
suite ran; re-running that file alone and re-running the full suite both
came back green immediately after, and `git stash` confirmed the failure
reproduced with no changes from this run applied to the tree, so it is a
pre-existing timing flake unrelated to this branch (a floating-point
`spanDays` value landing at `1.16e-8` instead of exactly `0`), not a
regression from this run's edits. No simulator or device in this
environment, so nothing in this run has been eyeballed on an actual iPad;
see DEVICE PASS NEEDED below, unchanged from runs 1 and 2.

## Completed

- Runs 1-2: plan items 1, 2a, 2b, 2c, 3, and a first pass at 6. See PLAN.md
  for detail; unchanged this run.
- Run 3, plan item 2d (the Leak Scan flow): applied the shared
  `contentColumnStyle` cap to all seven `components/leak-scan/*` screens
  `app/leak-scan.tsx` composes: `IntakeScreen`, `ScopeScreen`, `DeckScreen`,
  `BillsScreen`, `GracefulFailure`, `ResultsScreen` (both its normal
  scrolling state and its separate "undone" early-return state), and
  `PayoffScreen` (which has no ScrollView, so the cap went directly onto its
  one content View, `body`). Checked `IntakeScreen.tsx`'s pre-existing
  `maxWidth: '100%'` first per the plan's note: it is on the unrelated
  `fileChip` row style, not the container, so no collision. Every one of
  these is the same mechanical `...contentColumnStyle` spread into an
  existing style object that item 2b used elsewhere, not a new wrapper View,
  so (matching how 2b's own screens got no per-screen jest case) no new test
  was added for item 6 this run; the existing shared-contract test in
  `__tests__/tabletLayout.test.tsx` already pins the object every one of
  these screens spreads.
- Discovered and documented (not fixed) in PLAN.md items 2d and 5: `
  ScopeScreen` and `BillsScreen` each have a `footer` View (a confirm/skip
  button bar) that sits outside the capped ScrollView and was left
  un-capped. This is not a new gap unique to this run's work: it matches an
  existing, already-present pattern in `app/paywall.tsx`'s own `footer`
  (from item 2b, also left uncapped there) and in `PayoffScreen`'s Continue
  button (a sibling of the now-capped `body`). Whether these full-width CTA
  bars should get the same cap or are meant to stay edge to edge is a design
  call, so it went into item 5's audit list rather than being decided
  unilaterally mid-run.

## Next

Per PLAN.md, in order:
1. Item 2e: the Today Kept pane's header chrome (ribbon, kept quote,
   KeptHero) that sits outside the capped scroll content, once item 4's
   pager work gives a clear picture of that pane's width model. Worth
   noting: `FirstRunRibbon` (the same component item 2e is about) is also
   used for the door1 pane inside the already-capped `spentScrollContent`
   (line ~949 of `app/(tabs)/index.tsx`) as well as door3 outside it (line
   ~1042), so this item touches both panes, not just Kept.
2. Item 4: the Today pager's `screenWidth`-driven width math. Read ADR 0019
   first (plain ScrollView, no reanimated, in `app/(tabs)/index.tsx`) before
   touching it. This run's Leak Scan work did not touch pager-shaped code
   (none of the seven screens page), but run 2's `OnboardingCarousel` fix (a
   paging View whose width doubles as the offset-math denominator, solved by
   capping the content inside the page rather than the page itself) is the
   same shape of problem as this pager and may transfer directly; worth
   checking before inventing a different fix.
3. Item 5: the `useWindowDimensions` audit (list already gathered in
   PLAN.md item 5), now also carrying the fixed-footer cap question this run
   surfaced (see Completed above).
4. Item 6: extend tablet jest coverage as items 2e and 4 land (those, like
   Sheet and OnboardingCarousel before them, are likely to introduce a real
   structural change worth a dedicated test, unlike this run's mechanical
   spreads).

## Blockers

None currently. `npm install` was needed again at the start of this run
(fresh container, `node_modules` not present); expected, not a real
blocker, same as runs 1 and 2.

## DECISIONS NEEDED

- Whether the fixed footer/CTA bars outside a capped ScrollView (`
  ScopeScreen`, `BillsScreen`, `app/paywall.tsx`, `PayoffScreen`'s Continue
  button) should get the same 600pt cap on iPad, or are meant to stay full
  width by design. Flagged for the item 5 audit pass rather than decided in
  this run; raising here so it does not get lost.
- If item 4's pager fix turns out to need a visible behavior change (not
  just an internal width-math fix), that will need a Lane 2 call before
  merging, per ADR 0012: raise it here for the next run or for Charen rather
  than deciding it inside this routine.

## DEVICE PASS NEEDED

Nothing in this branch has been seen on a real iPad or the iPad simulator
(none is available in this environment). Before this ships, a human pass
should check, once the plan is further along (at minimum after items 2 and
3 land in full, ideally after 4 too):

- The 600pt capped column reads as intentional on iPad, not cramped or
  arbitrarily narrow, across Today, Money, Insights, Categories, habit
  detail, category detail, Profile, Paywall, the onboarding carousel beats,
  and now every Leak Scan screen (intake, scope, deck, bills, graceful
  failure, results, payoff).
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
  the rest of the beat content now) is not so narrow it looks like an
  error state.
- The Leak Scan flow end to end on iPad: intake's file-picker stage,
  scope's category rows, the deck's swipeable candidate cards, the bills
  offer rows, graceful failure, and the results dashboard, all now capped
  at 600pt; specifically whether the un-capped footer button bars on scope
  and bills (see DECISIONS NEEDED above) look like an intentional full-width
  CTA or an inconsistency against the capped content above them.
- The Today Spent/Kept pager (once item 4 lands): swiping between Spent and
  Kept feels right at the pager's actual width on iPad, in both portrait
  orientations of the device relative to any multitasking split view.
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
