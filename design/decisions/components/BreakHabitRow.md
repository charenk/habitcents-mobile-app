# BreakHabitRow (components/today/BreakHabitRow.tsx)

## Direction (current)
The Kept pane's dock content: the break-habit affordance, on the same [DockCard](DockCard.md) shell as the Spent pane's quick log. The label rides in the snow pill field in semibold sage, with the free-plan caption as a second line only at the ceiling, and the round sage plus on the right is the same control. Both halves open the break sheet, or the paywall at the free ceiling. It is the single re-entry point in both the empty and populated Kept views.

## States
- Zero habits: "Break your first habit".
- One or more: "Break another habit".
- Free ceiling: "Break another habit" over "1 habit on the free plan", both inside the fixed 52pt field; the tap routes to the paywall. Premium at its own ceiling gets no caption (the routing question is carried open by today.md, not resolved here).

## Decisions
- 2026-09-07 (Charen): extracted from inline JSX in `app/(tabs)/index.tsx` onto DockCard, and the dashed border leaves the dock. Why: one swipe from the quick log it was a different shape at a different height, and Charen asked for the two docks to be one structure. Dashed still means "add another" inside content (UpcomingList's add row, Today's watch nudge); a composer's primary action should not read as a tentative placeholder. Rejected: keeping the dashed edge at the shared height and pill radius, which Charen declined in favour of one solid shell.
- 2026-09-07: label colour `theme.primary` to match the plus beside it. The inline row used `primaryDark`, which since ADR 0027 is the same hex under another name; naming the role it now plays is the change, not the colour.
- 2026-09-07: the caption fits inside the fixed field rather than growing it. Why: the whole point of the shared shell is equal height in every state, and the ceiling is a state. Label 18 + caption 15 + 2pt gap is 51.5pt at the 1.5 cap, pinned by `__tests__/dockGeometry.test.tsx`.
- Ratified and unchanged: label by state and caption only at the ceiling (ADR 0038), the plus hidden from assistive tech with the caption folded into the field's spoken name (UX-055).

## Open
- At XXXL a long label is `numberOfLines={1}` and ellipsises rather than wrapping; "Break your first habit" fits the field on an iPhone 16 with room to spare, a narrower device is unverified.

## Iterations
- 2026-09-07: created from the inline affordance; styles `breakAnother*` removed from index.tsx.
