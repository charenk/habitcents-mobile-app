# LeakCard (components/habit-logging/LeakCard.tsx)

## Direction (current)
The "Leaks found" card: name, evidence (observed count and total until the rate is reliable, then a monthly rate), Break it (primary) / Not this one (secondary), the DT-1 coach slot once. Real buttons, never swipe-only.

## States
Observed evidence + keep-logging hint; reliable evidence; Break it again for a stopped habit; with / without the coach slot.

## Decisions
- Evidence states what was observed, never a fabricated rate (device feedback 2026-08-04; ADR 0022 spirit).

## Open
- Detection names the leak "<merchant> Spending", which reads oddly on the card, the pick-one sheet and the check-in card. Candidate: merchant name alone.

## Iterations
- None this branch.
