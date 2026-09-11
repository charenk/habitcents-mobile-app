# SpentKeptChips (components/habit-logging/SpentKeptChips.tsx)

## Direction (current)
The segmented scoreboard that is the Today tab control: cloud track (radius 23 = thumb 20 + 3), white thumb on the selected segment, eyebrow plus a 22pt serif amount. Spend is never sage. A dot on Kept means a leak has been detected since the user last looked at the Kept pane.

## States
Selected / unselected per side; started (amount) / not started ("No logs yet", "No skips yet"); new-leak dot.

## Decisions
- 2026-09-11 (QA loop, Charen): **the dot belongs to new leak detection, not to the check-in.** Why: tied to an unanswered daily check-in it was on almost permanently for anyone who does not answer every day, and people use habitcents for more than one thing; a dot that is always on says nothing, and this one was pointing at a card that sat below the fold behind the Leaks section anyway. It now means "a leak was found since you last looked at Kept", with a persisted `@habitcents_leaks_seen_at` marker compared against each leak's `discoveredAt`, cleared by looking at the Kept pane. Rejected: reordering the sections so the check-in led, which was the QA report's proposal; the section order is unchanged. Also rejected: "any undismissed discovered leak", which reintroduces the same always-on problem for a user who ignores one. Detected leaks only, not pre-detection candidates, which carry no `discoveredAt`. No marker stored reads as "already seen", so an upgrading install does not light up for old leaks. Spoken as `today.newLeakA11y`; the old `checkInPendingA11y` key is left in `constants/strings.ts` for the localization routine to reap. Pinned by `__tests__/newLeakDot.test.tsx` and `__tests__/todaySpentKept.test.tsx`. QA finding 9.
- 2026-09-10: **crossing between Spent and Kept fires `hapticSelection`.** Why: an audit on 2026-09-10 found 21 of the app's 27 haptic calls were `hapticError` and `hapticSelection` fired in exactly one place (the paywall's plan cards), so the product touched you almost only to say you were wrong. A switch is the most-repeated gesture in the app and answered with nothing at all. Guarded on a real change: re-pressing what is already selected does nothing, so buzzing for it would be the control lying about what happened. No motion is added; thumb swaps stay instant by house rule, and haptics keep firing under reduced motion by design (`utils/motion.ts`). The identical guard as SegmentedControl. Pinned in `__tests__/todaySpentKept.test.tsx`, which already carries the provider stack these chips need.
- 2026-09-03: not started is not zero; words until the activity exists, then an honest $0.00. ADR 0030.
- 2026-08-16: nesting rule track radius = thumb radius + padding, shared with SegmentedControl. ADR 0021.
- No motion on the thumb swap.

## Open
- None.

## Iterations
- 2026-09-11: the dot changes meaning to new leak detection (QA fix wave).
- 2026-09-03 91941bd: placeholders.
