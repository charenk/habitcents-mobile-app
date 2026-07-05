# 0004. Habit logging v2: week rhythm, identity arc with chapters, kept-hero moment

- **Date:** 2026-07-04
- **Status:** Accepted
- **Area:** Product / UX
- **Deciders:** Charen (accepted v2 in the Phase 2 design session; spec at `docs/design-package-phase2/01-habit-logging-spec.md`)

## Context
Decision 1 (ADR 0002) fixed the mental model: a daily check-in question ("Did you skip it today?"), a pick-one goal sheet with an editable per-skip value, a 3-state calendar (skipped / slipped / no-log), and the rule that a slip never subtracts from Kept. The design session prototyped that model (v1) and then a refined v2, which Charen accepted. The remaining question was how progress is narrated over time without streak-guilt mechanics.

## Decision
Adopt spec 01 v2 as the canonical habit-logging surface set:
1. **Check-in card with week strip (E1):** the daily card carries a 7-day strip of the current week's day states, giving rhythm context at the moment of logging.
2. **Long arc + chapters (E2):** progress narrates as an identity arc measured in total skips, with chapters at 10 / 30 / 50 / 66 total skips. Milestones count skips, not consecutive days, so a slip changes the streak but never the arc.
3. **Kept-hero moment (E3):** the log-save confirmation elevates the Kept counter as the hero; this is one of the two moments the Direction C motion layer targets (ADR 0005).
4. Pick-one sheet, 3-state calendar, slip/partial/backfill flows, copy set, and analytics events exactly as specified in 01; weekly/monthly leaks use the event-based "I skipped one" variant.

## Alternatives considered
- v1 as prototyped (plain check-in card, milestone days-in-a-row): weaker narrative; consecutive-day milestones reintroduce streak guilt after a slip, which fights the "slip is neutral" rule.
- Streak freezes or grace tokens: rejected on sight per the anti-goals; they gamify around honesty instead of coaching through it.

## Consequences
- Easier: the Leak Scan Track CTA, Coach Moment slot, and onboarding success screen all land on one well-specified surface; chapters give Coach Moments natural triggers.
- Harder / cost: week strip and arc need real date math over the day-state store; build size L. The check-in surfaces are the dependency gate for build items 3 and 5.
- Build reference: prototypes `Habit Logging Prototype v2.html` and `habit-logging-v2-app.jsx`.
