# ipad-worker handoff

## Status

In progress. Run 2 of the routine. Rebased cleanly onto origin/main (no
conflicts). tsc clean, full test suite green (99 suites, 1072 tests,
including one new case added to `__tests__/tabletLayout.test.tsx`). No
simulator or device in this environment, so nothing in this run has been
eyeballed on an actual iPad; see DEVICE PASS NEEDED below, unchanged from
run 1.

## Completed

- Run 1: plan items 1, 2a, 2b, 3, and a first pass at 6. See PLAN.md for
  detail; unchanged this run.
- Run 2, plan item 2c: read `app/onboarding/welcome.tsx` (renders only
  `OnboardingCarousel`, no layout of its own) and `app/onboarding/intent.tsx`
  (a bare `Redirect`, retired route) and confirmed neither needed a change.
  `components/onboarding/OnboardingCarousel.tsx`'s paged beats were the one
  real case: each `beat` View is deliberately full window width because
  `handleScroll` divides the scroll offset by that same width to find the
  current page, so the shared cap could not go directly onto `beat` the way
  it goes into a `contentContainerStyle` elsewhere in this plan (that would
  shrink the paging unit itself and break the offset math). Added one new
  `beatContent` wrapper View, spreading the existing `contentColumnStyle`,
  around each beat's media/headline/hook/CTA; `beat`'s own width is
  untouched, and below the 600pt cap `beatContent` is a pass-through
  (`width: '100%'`), so phone rendering is unchanged. Also read
  `components/onboarding/BreakHabitSheet.tsx` (already routes through the
  capped `Sheet`, no change needed) and `AuroraBackground.tsx` (a full-bleed
  decorative gradient strip, not content; capping it would leave visible
  gaps at the screen edges, so left alone, consistent with it already being
  on item 5's audit list as a `height`-reading, not `width`-reading, site).
- Extended `__tests__/tabletLayout.test.tsx` with a case pinning
  `beatContent`'s style (the beat itself stays window width, only the
  wrapper carries the cap).

## Next

Per PLAN.md, in order:
1. Item 2d: the Leak Scan flow (`app/leak-scan.tsx` and its seven
   `components/leak-scan/*Screen.tsx` children). Note `IntakeScreen.tsx`
   already has an unrelated `maxWidth: '100%'` on some element; check it
   does not collide before adding the shared cap there.
2. Item 2e: the Today Kept pane's header chrome (ribbon, kept quote,
   KeptHero) that sits outside the capped scroll content, once item 4's
   pager work gives a clear picture of that pane's width model. Worth
   noting: `FirstRunRibbon` (the same component item 2e is about) is also
   used for the door1 pane inside the already-capped `spentScrollContent`
   (line ~949 of `app/(tabs)/index.tsx`) as well as door3 outside it (line
   ~1042), so this item touches both panes, not just Kept.
3. Item 4: the Today pager's `screenWidth`-driven width math. Read ADR 0019
   first (plain ScrollView, no reanimated, in `app/(tabs)/index.tsx`) before
   touching it. This run's item 2c fix to `OnboardingCarousel` is the same
   shape of problem (a paging View whose width doubles as the offset-math
   denominator) solved the same way (cap the content inside the page, not
   the page itself); that pattern may transfer directly to the Today pager,
   worth checking first before inventing a different fix.
4. Item 5: the `useWindowDimensions` audit (list already gathered in
   PLAN.md item 5).
5. Item 6: extend tablet jest coverage as each of the above lands.

## Blockers

None currently. `npm install` was needed again at the start of this run
(fresh container, `node_modules` not present); expected, not a real
blocker, same as run 1.

## DECISIONS NEEDED

None yet. If item 4's pager fix turns out to need a visible behavior change
(not just an internal width-math fix), that will need a Lane 2 call before
merging, per ADR 0012: raise it here for the next run or for Charen rather
than deciding it inside this routine.

## DEVICE PASS NEEDED

Nothing in this branch has been seen on a real iPad or the iPad simulator
(none is available in this environment). Before this ships, a human pass
should check, once the plan is further along (at minimum after items 2 and
3 land in full, ideally after 4 too):

- The 600pt capped column reads as intentional on iPad, not cramped or
  arbitrarily narrow, across Today, Money, Insights, Categories, habit
  detail, category detail, Profile, Paywall, and now the onboarding
  carousel beats.
- Bottom sheets (`components/ui/Sheet.tsx` and everything built on it:
  ExpenseSheet, AddUpcomingSheet, PickOneSheet, PartialSlipSheet,
  BreakHabitSheet, ConfirmSheet, the currency and category pickers) look
  right centered at the capped width, including the keyboard-avoiding
  behavior on forms (ExpenseSheet, AddUpcomingSheet) with the iPad
  on-screen keyboard, which is shaped differently from the phone one.
- The onboarding carousel: swiping between beats on iPad, confirming the
  capped `beatContent` column reads well against the still full-width
  `beat` page background, and that `BeatMedia`'s frame (capped along with
  the rest of the beat content now) is not so narrow it looks like an
  error state.
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
