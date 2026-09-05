# KeptHero (components/habit-logging/KeptHero.tsx)

## Direction (current)
The kept band: sage-light feature card, eyebrow "Kept so far", 42pt serif amount, caption. The one cross-habit aggregate in the app. Motionless. Mounts only once a leak or habit exists (or while loading); in Kept Zero there is no band.

## States
Zero caption ("your first skip starts this counter") / running caption.

## Decisions
- 2026-09-04: the pane opens straight on the band; no quote above it. ADR 0033.
- 2026-09-03: no band in Kept Zero.
- DI-6: 20pt gutter on Today.

## Open
- The band is fixed while the SectionList scrolls beneath it, so cards slide under it mid-scroll. Candidate: render it as the list header. Note the pane now also ends in an ActionDock below that list (ADR 0038), so the scroll region is bounded by fixed chrome on both ends; a list-header move should look at both edges together.

## Iterations
- 2026-09-04 d739f59: quote above it removed.
