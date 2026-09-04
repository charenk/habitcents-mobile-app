# ipad-worker handoff

## Status

In progress. Run 1 of the routine, first commit to this branch. tsc clean,
full test suite green (99 suites, 1071 tests, including the new
`__tests__/tabletLayout.test.tsx`). No simulator or device in this
environment, so nothing in this run has been eyeballed on an actual iPad;
see DEVICE PASS NEEDED below.

## Completed

- Plan item 1: `app.json` `ios.supportsTablet` set to `true`. This changes
  the native fingerprint (per ADR 0029), so `eas update` alone will not ship
  it. A new `eas build` is required before any of this reaches a device or
  the App Store.
- Plan item 2a/2b: added `layout.contentMaxWidth` (600) and
  `contentColumnStyle` to `constants/theme.ts`, and spread it into the
  scroll content style of every tab screen and push screen: Today (both
  panes), Money, Insights, Categories, habit detail, category detail,
  Profile, Paywall. Below 600pt window width this is a no-op
  (`width: '100%'` already equals the screen), so phone rendering is
  unchanged; above it the column caps and centers.
- Plan item 3: `components/ui/Sheet.tsx`'s panel now carries the same cap
  and centering, so bottom sheets stop going full-bleed on a wide window.
- Plan item 6 (partial): added `__tests__/tabletLayout.test.tsx` pinning the
  shared style contract and the Sheet panel's style.

## Next

Per PLAN.md, in order:
1. Item 2c: onboarding screens (`app/onboarding/`,
   `components/onboarding/`).
2. Item 2d: the Leak Scan flow (`app/leak-scan.tsx` and its seven
   `components/leak-scan/*Screen.tsx` children).
3. Item 2e: the Today Kept pane's header chrome (ribbon, kept quote,
   KeptHero) that sits outside the capped scroll content, once item 4's
   pager work gives a clear picture of that pane's width model.
4. Item 4: the Today pager's `screenWidth`-driven width math. Read
   ADR 0019 first (plain ScrollView, no reanimated, in
   `app/(tabs)/index.tsx`) before touching it.
5. Item 5: the `useWindowDimensions` audit (list already gathered in
   PLAN.md item 5).
6. Item 6: extend tablet jest coverage as each of the above lands.

## Blockers

None currently. `npm install` was needed at the start of this run
(`node_modules` was not present in this checkout); that is expected in a
fresh container, not a real blocker.

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
  detail, category detail, Profile and Paywall.
- Bottom sheets (`components/ui/Sheet.tsx` and everything built on it:
  ExpenseSheet, AddUpcomingSheet, PickOneSheet, PartialSlipSheet,
  BreakHabitSheet, ConfirmSheet, the currency and category pickers) look
  right centered at the capped width, including the keyboard-avoiding
  behavior on forms (ExpenseSheet, AddUpcomingSheet) with the iPad
  on-screen keyboard, which is shaped differently from the phone one.
  scale.
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
