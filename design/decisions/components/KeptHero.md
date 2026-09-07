# KeptHero (components/habit-logging/KeptHero.tsx)

## Direction (current)
The kept band: sage-light feature card, eyebrow "Kept so far", 42pt serif amount, caption. Motionless. Since 2026-09-07 it renders in one place, the leak-scan payoff screen (`components/leak-scan/PayoffScreen.tsx`, the user's own zero with its own caption). It no longer renders on Today.

## States
Zero caption ("your first skip starts this counter") / running caption.

## Decisions
- 2026-09-07 (Charen): removed from Today's Kept pane in every state it showed (Kept Live and the loading placeholder). Why: once a leak or a breaking habit exists, the band sat above the Leaks found list repeating a number the chips ("Kept today") and each habit's own Kept stat already carry, and in Charen's words, with the current design and patterns it was not valuable. The pane is now the list plus the dock. Where the cross-habit total surfaces next, if anywhere, is deferred to a later exploration; nothing was designed to replace it. Reverses the band half of the 2026-09-04 decision below. Side effect: the Open item below about cards sliding under a fixed band closes by deletion.
- 2026-09-04: the pane opens straight on the band; no quote above it. ADR 0033. **REVERSED 2026-09-07: no band on Today at all.**
- 2026-09-03: no band in Kept Zero.
- DI-6: 20pt gutter on Today. **Moot since 2026-09-07.**

## Open
- Closed 2026-09-07 by removal: the band was fixed while the SectionList scrolled beneath it, so cards slid under it mid-scroll.
- The all-time kept total now has no home on Today. The chips carry today's kept, habit detail carries each habit's, and `totalKept` (the cross-habit sum) is no longer computed anywhere. If a total earns a place later, it should be designed rather than the band restored.

## Iterations
- 2026-09-07: removed from Today; the payoff screen is the only caller.
- 2026-09-04 d739f59: quote above it removed.
