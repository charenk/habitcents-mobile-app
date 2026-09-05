# QuickLogRow (components/money/QuickLogRow.tsx)

## Direction (current)
The amount-first entry to the core loop: a white card at the chips' outer radius (23) with a snow field (radius 13, 28pt serif placeholder) and a sage plus square; both open the log sheet. Never taller than the chips. It lives in the Spent pane's ActionDock at the bottom of the screen.

## States
Resting, pressed (field to cloud, plus to pressed sage).

## Decisions
- 2026-09-05: the field gains a spoken hint, "Opens the log sheet with the amount ready to type." Why: on Spent Zero, VoiceOver meets two buttons named "Log an expense" back to back, the empty state's CTA and this field; the shared name is deliberate (one canonical CTA label), so the hint is what tells them apart without changing the accessible name. ADR 0039 review.
- 2026-09-05: moved from the top of the Spent scroller to the pane's ActionDock at the bottom. Why: the action sat at the top of Spent and the bottom of Kept, so it jumped as the pager swiped; and the thumb zone is where a ten-second log belongs. ADR 0038.
- 2026-09-04: no message ever renders above this card (InfoRibbon rule). ADR 0033. **AMENDED 2026-09-05:** with the card docked at the bottom, every piece of content is above it, so the clause cannot be satisfied as written. The half that carries the meaning, "below the content it comments on", still holds. ADR 0038.
- 2026-09-03: radius and height paired with the chips track. **Still the values, no longer the reason:** the two no longer adjoin, so they share a radius family rather than a nesting rule. The concentric derivation is still pinned by a test.
- U13: category tiles removed; the sheet's rail covers the choice.

## Open
- None.

## Iterations
- 2026-09-04 d739f59: the first-run ribbon no longer renders above it.
