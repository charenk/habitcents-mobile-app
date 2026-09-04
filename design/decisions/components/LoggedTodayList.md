# LoggedTodayList (components/money/LoggedTodayList.tsx)

## Direction (current)
The "Today's log" section: eyebrow row with View all when rows exist, then a white feature card of ExpenseRows with hairline separators. With no rows today it renders the persistent InfoRibbon ("A quiet day so far") in the card's place. It is the list section the first-run receipt and the watch nudge attach under.

## States
Rows (with View all), quiet day (ribbon, no View all).

## Decisions
- 2026-09-04: quiet day is the persistent ribbon, not a body-only empty state in a card. ADR 0033.
- U6: eyebrow "Today's log"; View all only with rows.

## Open
- None.

## Iterations
- 2026-09-04 d739f59: ribbon replaces the empty card.
