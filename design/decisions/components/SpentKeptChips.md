# SpentKeptChips (components/habit-logging/SpentKeptChips.tsx)

## Direction (current)
The segmented scoreboard that is the Today tab control: cloud track (radius 23 = thumb 20 + 3), white thumb on the selected segment, eyebrow plus a 22pt serif amount. Spend is never sage. A pending dot on Kept means today's check-in is unanswered.

## States
Selected / unselected per side; started (amount) / not started ("No logs yet", "No skips yet"); pending dot.

## Decisions
- 2026-09-03: not started is not zero; words until the activity exists, then an honest $0.00. ADR 0030.
- 2026-08-16: nesting rule track radius = thumb radius + padding, shared with SegmentedControl. ADR 0021.
- No motion on the thumb swap.

## Open
- None.

## Iterations
- 2026-09-03 91941bd: placeholders.
