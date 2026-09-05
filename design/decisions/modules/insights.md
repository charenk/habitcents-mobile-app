# Insights (app/(tabs)/insights.tsx)

## Direction (current)
Where the money went, and which leaks are worth breaking. Two segments: This month is the ongoing read (leaks, where it went, pace), First scan is the one-off read of a bank statement the user already has. Insights never invents a number; a card that cannot answer honestly says so and waits (ADR 0022).

## States
Vocabulary (ADR 0034): **Zero** nothing ever happened here; **Live** data present.

- This month Zero: no expenses and no leaks, so the whole three-card stack is replaced by a pane-level empty state, 96pt book, "See where the month went". Reach: Persona new user.
- This month Live: LeaksCard, WhereItWentCard, PaceCard. Each carries its own in-card empty line rather than disappearing, so the shape of the screen is stable as data arrives.
- First scan Zero: no scan on file, 96pt magnifier, "Find the leaks you already have". Reach: Persona new user.
- First scan Live: ScanSnapshotCard.
- First scan indeterminate: while the stored summary is still loading the pane renders nothing at all, so the zero state never flashes before a real answer lands.

## Decisions
- 2026-09-05: both Zero states carry 96pt illustrations instead of the shared 28pt ChartLine glyph. Why: This month and First scan are different questions and rendered the same mark. ADR 0036.
- 2026-09-05: `scanEmptyTitle` ("Find the leaks you already have") was left untouched in the copy pass and used as the model for every other zero state. Why: it is the only line in the app that names a benefit the user already owns rather than an action they must take.
- 2026-09-05: `monthEmptyTitle` became "See where the month went". Why: "Your first insights are a few logs away" measured the distance to value instead of naming it.
- In-card empty states (leaks, where it went, pace) stay text-only, no art. Why: an illustration inside a card competes with the card it sits in; the pane-level mark is the one that earns the space.
- Pace and Where it went carry no CTA. Why: they resolve with time and data, not with a tap, and a button there would be a lie about what the user can do.

## Open
- The This month illustration is a placeholder. A book means reading, and the app deliberately deleted its lessons section in Phase 2, so the art advertises a feature that does not exist. A pie or bar chart belongs here. Seen on the 2026-09-05 walk, the weakest art-to-copy pairing after Upcoming. ADR 0036.
- Whether Insights' empty states drop their body line as Today's did (carried over from EmptyState.md).

## Iterations
- 2026-09-05: illustrations on both Zero states, `monthEmptyTitle` rewritten. ADR 0036.
