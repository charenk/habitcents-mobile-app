# Chip (components/ui/Chip.tsx)

## Direction (current)
One selectable pill. Default shape: radius 14, 40pt, 1px border, 14pt label. `pill`: radius 999, 44pt, 1.5px border, 12.5pt label. Selected tone `solid` (sage fill, white text) or `soft` (sage-light fill, sage border, ink text) for any selected surface where a solid fill would read as a CTA; the tab bar's selected pill carries the same tone (ADR 0037). Unselected is always white on cloud with slate text.

## States
Unselected, selected (solid / soft), disabled, pressed (opacity 0.7), with emoji, with identity tint on the unselected border.

## Decisions
- 2026-09-04: rows of chips on one sheet share one shape; the expense sheet uses `pill` for merchants and categories alike. ADR 0033.
- U2: `soft` tone and `pill` shape were introduced for the expense drawer's rails.
- 2026-09-05: the tab bar became the `soft` tone's second consumer (ADR 0037), and `TabBarIcon.tsx` re-implements the fill-plus-border pair rather than rendering a Chip, because a tab item is not a Chip. Drift risk recorded: a change to the soft tone's colours must visit both files.

## Open
- BreakHabitSheet and AddUpcoming still use the default shape; decide whether pills become the rule for every chip row on a sheet.

## Iterations
- 2026-09-04 d739f59: merchant chips in ExpenseSheet switched to `pill`.
