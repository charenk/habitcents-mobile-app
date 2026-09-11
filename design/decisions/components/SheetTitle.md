# SheetTitle (components/ui/SheetTitle.tsx)

## Direction (current)
The pinned title block for decision sheets, passed through Sheet's `header`
slot so the serif title joins the drag zone and stays visible while the body
scrolls. displayMid (30) title, one optional label-size caption in slate,
paddingHorizontal 20, no border, no actions. Deliberately not a mode of
SheetHeader: the two sheet families stay two components (modules/drawers.md).

## States
Title alone; title + caption.

## Decisions
- 2026-09-10: created for the sticky-title-on-every-drawer pattern (Charen).
  Consumers: PickOneSheet, BreakHabitSheet (both variants each). ConfirmSheet,
  CurrencySheet and HowItWorksSheet pin their own smaller title Views instead;
  sheetTitle 26 is their identity and SheetTitle does not absorb it.

## Open
- None.

## Iterations
- 2026-09-10: first version.
