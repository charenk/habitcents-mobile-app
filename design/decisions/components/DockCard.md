# DockCard (components/today/DockCard.tsx)

## Direction (current)
The one shape both of Today's docks take: a white pill shell with a 1px cloud edge and 10pt padding, holding a snow pill field on the left at a fixed 52pt and a round sage plus on the right that stretches to the same height. [QuickLogRow](QuickLogRow.md) puts the amount in the field; [BreakHabitRow](BreakHabitRow.md) puts the label in it. The shell totals 74pt on both panes, so the dock's top edge lands at one y as the pager swipes.

## States
Field resting (snow) and pressed (cloud); plus resting (sage) and pressed (pressed sage). The plus is hidden from assistive tech on both panes (UX-055); the field carries the spoken name.

## Decisions
- 2026-09-07 (Charen): one shell for both docks, pill corners. Why: the quick log and the break affordance were two objects at two heights one swipe apart, and ActionDock's own record admitted it. A composer grammar that is the same on every pane is what stops the chrome jumping. Pill rather than the switchers' rounded rect: PATTERN_VOCABULARY reserves the rounded-rect nesting rule for the two switchers, and Charen asked for fully round on the dock specifically.
- 2026-09-07: the field height is fixed, not a minimum. Why: a minimum only equalises the docks while their contents happen to be the same size, and they were not. 52 holds the 28pt serif amount at its 1.3 cap (about 44pt) and the Kept label plus caption at the 1.5 chrome cap (51.5pt), clears the 44pt target floor, and keeps the shell under the 77pt chips row. Pinned by `__tests__/dockGeometry.test.tsx`, which reads the constant rather than repeating it.
- 2026-09-07: the plus squares its width off the stretched height (`aspectRatio: 1`) rather than pinning a width. Carried over from QuickLogRow, where it kept the square square as the field grew under Dynamic Type; now it keeps the circle round for the same reason.

## Open
- Verified on the iPhone 16 simulator at default and XXXL. The serif line box at the 1.3 cap is an estimate from font metrics; if a device pass ever shows the amount clipping, `DOCK_FIELD_HEIGHT` is the one number to move.
- Android clips text that exceeds a fixed height where iOS lets it spill. The caption case is the tightest (51.5 of 52 at the cap); the geometry test guards the arithmetic, a real Android pass is still owed.

## Iterations
- 2026-09-07: created; QuickLogRow and BreakHabitRow moved onto it.
