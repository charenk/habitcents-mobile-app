# CheckInCard (components/habit-logging/CheckInCard.tsx)

## Direction (current)
The answer card, identical on Today and habit detail. Daily: week strip, question, Skipped it (primary, wider) / Bought it. Weekly or monthly: cadence pill, period chip, one "I skipped one" button. Answered: badge (sage check for a skip, cloud minus for a slip), headline, detail, coach slot, Change answer, Spent less than usual? on a slip, backfill pair when yesterday is open. The one playful motion in the app lives on the skip confirmation.

## States
pending, skipped, slipped, partial, milestone (lavender slot), backfill offered / used, weekly with or without today's confirmation, first run line.

## Decisions
- ADR 0004: week rhythm, chapters at 10/30/50/66 total skips, slips never subtract.
- ADR 0027: white on sage for the skip badge.
- Answers stack past 1.3 font scale.

## Open
- "Skipped it · keeps $6.50" wraps to two lines at the default size beside a one-line "Bought it" (2026-09-04 walk). Candidate: shorter label or a taller row by design.
- Cards scroll under the fixed kept band (see KeptHero).

## Iterations
- None this branch.
