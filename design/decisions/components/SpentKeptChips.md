# SpentKeptChips (components/habit-logging/SpentKeptChips.tsx)

## Direction (current)
The segmented scoreboard that is the Today tab control: cloud track (radius 23 = thumb 20 + 3), white thumb on the selected segment, eyebrow plus a 22pt serif amount. Spend is never sage. A pending dot on Kept means today's check-in is unanswered.

## States
Selected / unselected per side; started (amount) / not started ("No logs yet", "No skips yet"); pending dot.

## Decisions
- 2026-09-10: **crossing between Spent and Kept fires `hapticSelection`.** Why: an audit on 2026-09-10 found 21 of the app's 27 haptic calls were `hapticError` and `hapticSelection` fired in exactly one place (the paywall's plan cards), so the product touched you almost only to say you were wrong. A switch is the most-repeated gesture in the app and answered with nothing at all. Guarded on a real change: re-pressing what is already selected does nothing, so buzzing for it would be the control lying about what happened. No motion is added; thumb swaps stay instant by house rule, and haptics keep firing under reduced motion by design (`utils/motion.ts`). The identical guard as SegmentedControl. Pinned in `__tests__/todaySpentKept.test.tsx`, which already carries the provider stack these chips need.
- 2026-09-03: not started is not zero; words until the activity exists, then an honest $0.00. ADR 0030.
- 2026-08-16: nesting rule track radius = thumb radius + padding, shared with SegmentedControl. ADR 0021.
- No motion on the thumb swap.

## Open
- None.

## Iterations
- 2026-09-03 91941bd: placeholders.
