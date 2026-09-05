# LoggedTodayList (components/money/LoggedTodayList.tsx)

## Direction (current)
The "Today's log" section: eyebrow row with View all when rows exist, then a white feature card of ExpenseRows with hairline separators. With no rows today it renders the persistent InfoRibbon ("A quiet day so far") in the card's place. It is the list section the first-run receipt and the watch nudge attach under.

## States
Rows (with View all), quiet day (ribbon, no View all).

## Decisions
- 2026-09-05: the eyebrow's 24pt top margin moved out. Why: it was clearance from the quick-log card that used to sit directly above; once the card moved to the dock (ADR 0038) it stacked on the chips' own 12pt into a visible hole. Today, the only consumer, owns the gap via the chips row.
- 2026-09-05: the eyebrow row takes the ratified 1.5 chrome cap, one line each side, the eyebrow shrinks and the View all link keeps its width, with an 8pt gap so they can never abut. Why: both were raw Text and missed the caps baked into the primitives; at 3x they collided and ran off the edge. ADR 0039.
- 2026-09-04: quiet day is the persistent ribbon, not a body-only empty state in a card. ADR 0033.
- U6: eyebrow "Today's log"; View all only with rows.

## Open
- None.

## Iterations
- 2026-09-05: eyebrow margin and Dynamic Type fixes (ADR 0038, 0039).
- 2026-09-04 d739f59: ribbon replaces the empty card.
