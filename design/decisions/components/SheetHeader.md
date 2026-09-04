# SheetHeader (components/ui/SheetHeader.tsx)

## Direction (current)
The pinned row every form sheet shares: serif `sheetTitle` left, compact primary Save right (44pt, one word), hairline bottom edge, rendered through `Sheet`'s `header` prop so it drags the sheet. At most one icon action left of Save (`secondaryAction`): 44pt, tertiary, coral when destructive, 12pt gap, spoken label required. No generic slot.

## States
Save enabled / disabled (with `saveHint` only while disabled); with / without the icon action.

## Decisions
- 2026-09-04: one optional icon action, not a slot. Why: the sixth consumer ADR 0031 anticipated arrived (edit delete); one action keeps the row legible. ADR 0033.
- 2026-09-04: the icon sits 12pt left of Save, never flush. Why: destructive beside the most-tapped button is the classic mis-tap layout. ADR 0033.
- 2026-09-04: Save label is one word on every consumer. ADR 0033.
- 2026-09-04 (0031): title left, Save right, no Cancel. ADR 0031.

## Open
- None.

## Iterations
- 2026-09-04 d739f59: `secondaryAction`; consumers moved to `Sheet` `header`.
