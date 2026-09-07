# DockCard (components/today/DockCard.tsx)

## Direction (current)
The one STRUCTURE both of Today's docks take: a white pill shell holding a snow pill field on the left at a fixed 52pt and a round plus on the right that stretches to the same height, 74pt outer in every case, so the dock's top edge lands at one y as the pager swipes. Two skins on that structure: the solid tone (1px cloud edge, filled sage plus) is the composer, [QuickLogRow](QuickLogRow.md); the dashed tone (1.5pt dashed cloudDashed edge, plain snow plus with a sage glyph) is "add another", [BreakHabitRow](BreakHabitRow.md).

## States
Field resting (snow) and pressed (cloud). Filled plus resting (sage) and pressed (pressed sage); plain plus resting (snow) and pressed (cloud). The plus is hidden from assistive tech on both panes (UX-055); the field carries the spoken name.

## Decisions
- 2026-09-07 (Charen, later the same day): the shell and the plus each take a `tone`, and Kept's dock is dashed with a plain plus. Why: with both docks solid and sage, "Break your first habit" read as another add-expense composer; Charen wanted it structurally the same and visibly different. Dashed is the grammar the app already uses for "add another" (UpcomingList's add row, the watch nudge), and it had been on this affordance until that morning. The plain plus is the field's own snow with the label's own sage, the quietest treatment that still reads as a button; rejected: a white circle with a cloud border (reads as header chrome) and a dashed-outline circle (two nested dashed edges read busy). The dashed tone's 1.5pt edge is paid for out of its padding (9.5 instead of 10) so both tones stay 74pt outer; pinned by `__tests__/dockGeometry.test.tsx`. Reverses the "one solid shell" half of the decision below, not the "one structure" half.
- 2026-09-07 (Charen): one shell for both docks, pill corners. Why: the quick log and the break affordance were two objects at two heights one swipe apart, and ActionDock's own record admitted it. A composer grammar that is the same on every pane is what stops the chrome jumping. Pill rather than the switchers' rounded rect: PATTERN_VOCABULARY reserves the rounded-rect nesting rule for the two switchers, and Charen asked for fully round on the dock specifically.
- 2026-09-07: the field height is fixed, not a minimum. Why: a minimum only equalises the docks while their contents happen to be the same size, and they were not. 52 holds the 28pt serif amount at its 1.3 cap (about 44pt) and the Kept label plus caption at the 1.5 chrome cap (51.5pt), clears the 44pt target floor, and keeps the shell under the 77pt chips row. Pinned by `__tests__/dockGeometry.test.tsx`, which reads the constant rather than repeating it.
- 2026-09-07: the plus squares its width off the stretched height (`aspectRatio: 1`) rather than pinning a width. Carried over from QuickLogRow, where it kept the square square as the field grew under Dynamic Type; now it keeps the circle round for the same reason.

## Open
- Verified on the iPhone 16 simulator at default and XXXL. The serif line box at the 1.3 cap is an estimate from font metrics; if a device pass ever shows the amount clipping, `DOCK_FIELD_HEIGHT` is the one number to move.
- Android clips text that exceeds a fixed height where iOS lets it spill. The caption case is the tightest (51.5 of 52 at the cap); the geometry test guards the arithmetic, a real Android pass is still owed.

## Iterations
- 2026-09-07 (later): `tone` on the shell and the plus; Kept dashed and plain; `DOCK_SHELL_HEIGHT` exported and pinned across both tones.
- 2026-09-07: created; QuickLogRow and BreakHabitRow moved onto it.
