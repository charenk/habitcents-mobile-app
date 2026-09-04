# EmptyState (components/ui/EmptyState.tsx)

## Direction (current)
The one empty-state primitive: optional 28pt slate icon, optional title, optional body, optional secondary CTA, in a 12pt centered stack. `inline` leaves the container to the caller; `fill` adds the default icon and pane padding. On Today the pattern is icon, title, CTA and nothing else.

## States
With or without each part; inline / fill.

## Decisions
- 2026-09-04: `body` is optional; Today's two zero states pass none. Why: the body repeated the title; Money, Insights and Categories keep theirs for now. ADR 0033.
- Empty-state unification pass: one primitive replaces four treatments.

## Open
- Decide whether Money's, Insights' and Categories' empty states drop their body too.

## Iterations
- 2026-09-04 d739f59: body optional; `spentEmptyBody` and `keptEmptyBody` removed.
