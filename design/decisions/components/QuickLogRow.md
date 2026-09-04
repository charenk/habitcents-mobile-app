# QuickLogRow (components/money/QuickLogRow.tsx)

## Direction (current)
The amount-first entry to the core loop: a white card at the chips' outer radius (23) with a snow field (radius 13, 28pt serif placeholder) and a sage plus square; both open the log sheet. Never taller than the chips. Nothing sits above it but the chips.

## States
Resting, pressed (field to cloud, plus to pressed sage).

## Decisions
- 2026-09-04: no message ever renders above this card (InfoRibbon rule). ADR 0033.
- 2026-09-03: radius and height paired with the chips track.
- U13: category tiles removed; the sheet's rail covers the choice.

## Open
- None.

## Iterations
- 2026-09-04 d739f59: the first-run ribbon no longer renders above it.
