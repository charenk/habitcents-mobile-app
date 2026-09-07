# QuickLogRow (components/money/QuickLogRow.tsx)

## Direction (current)
The amount-first entry to the core loop, and the Spent pane's dock content. Since 2026-09-07 it is built on [DockCard](DockCard.md), the shell it shares with the Kept pane's [BreakHabitRow](BreakHabitRow.md): a white pill with a 1px cloud edge, a snow pill field holding the 28pt serif placeholder, and a round sage plus. Both halves open the log sheet. The field is a fixed 52pt so the two docks are the same height in every state.

## States
Resting, pressed (field to cloud, plus to pressed sage).

## Decisions
- 2026-09-07 (Charen): the card becomes a pill on the shared DockCard shell, at the shared fixed field height. Why: one swipe away, the Kept dock was a different shape at a different height, and Charen asked for the two to be structurally one thing with fully round corners. Rejected: keeping this card's own radius family and only matching heights, which would have left two shells side by side. Reverses the 2026-09-03 line below.
- 2026-09-05: the field gains a spoken hint, "Opens the log sheet with the amount ready to type." Why: on Spent Zero, VoiceOver meets two buttons named "Log an expense" back to back, the empty state's CTA and this field; the shared name is deliberate (one canonical CTA label), so the hint is what tells them apart without changing the accessible name. ADR 0039 review.
- 2026-09-05: moved from the top of the Spent scroller to the pane's ActionDock at the bottom. Why: the action sat at the top of Spent and the bottom of Kept, so it jumped as the pager swiped; and the thumb zone is where a ten-second log belongs. ADR 0038.
- 2026-09-04: no message ever renders above this card (InfoRibbon rule). ADR 0033. **AMENDED 2026-09-05:** with the card docked at the bottom, every piece of content is above it, so the clause cannot be satisfied as written. The half that carries the meaning, "below the content it comments on", still holds. ADR 0038.
- 2026-09-03: radius and height paired with the chips track. **Still the values, no longer the reason:** the two no longer adjoin, so they share a radius family rather than a nesting rule. The concentric derivation is still pinned by a test. **REVERSED 2026-09-07:** the card is a pill and the derivation is gone, along with its test; the shared numbers now live in DockCard.
- U13: category tiles removed; the sheet's rail covers the choice.

## Open
- None.

## Iterations
- 2026-09-07: rebuilt on DockCard; pill shell, fixed 52pt field, round plus. `__tests__/quickLogRow.test.tsx` rewritten onto the shared constant; `__tests__/dockGeometry.test.tsx` pins it against BreakHabitRow.
- 2026-09-04 d739f59: the first-run ribbon no longer renders above it.
