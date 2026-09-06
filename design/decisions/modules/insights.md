# Insights (app/(tabs)/insights.tsx)

## Direction (current)
Where the money went, and which leaks are worth breaking. Two segments: This month is the ongoing read (leaks, where it went, pace), First scan is the one-off read of a bank statement the user already has. Insights never invents a number; a card that cannot answer honestly says so and waits (ADR 0022). The segments are reachable by tapping the control or by swiping between them, the same as Today's panes.

## States
Vocabulary (ADR 0034): **Zero** nothing ever happened here; **Live** data present.

- This month Zero: no expenses and no leaks, so the whole three-card stack is replaced by a pane-level empty state, 96pt exploded pie chart, "See where the month went". Reach: Persona new user.
- This month Live: LeaksCard, WhereItWentCard, PaceCard. Each carries its own in-card empty line rather than disappearing, so the shape of the screen is stable as data arrives.
- First scan Zero: no scan on file, 96pt magnifier, "Find the leaks you already have". Reach: Persona new user.
- First scan Live: ScanSnapshotCard.
- First scan indeterminate: while the stored summary is still loading the pane renders nothing at all, so the zero state never flashes before a real answer lands.

## Decisions
- 2026-09-06: both segments became pages of one pager, so a swipe moves between them. Why: the same control behaved differently on Today than here. Not a new switcher; SegmentedControl is unchanged and gained the affordance Today's scoreboard already had. See [SegmentPager](../components/SegmentPager.md).
- 2026-09-06: the `isLoading` early return is untouched, so the pager mounts only once the reports context has settled. Why: its first positioning is silent by design, so a late mount cannot animate a page into view, and the loading state stays a screen with no switcher rather than a switcher with nothing behind it. Pinned by a test.
- 2026-09-06: the indeterminate scan branch (render nothing while `getScanSummary` is in flight) moved inside the scan pane unchanged, so the "no scan yet" empty state still never flashes before a real answer lands.
- 2026-09-06: `insights_view_switched` fires on every switch with `to` and `method`, matching Today and Money. Structural identifiers only. Approved by Charen (analytics contracts are human-gated, ADR 0035).
- 2026-09-05: the segment wrapper's top margin drops 12 to 8, matching Money and Today. Why: it was the only one of the three not revisited after the shared-header migration, and the 4pt made the control visibly jump when switching tabs. ADR 0039.
- 2026-09-05: the leaks card's in-card empty state loses its title. Why: the card header already reads "Your leaks" and the title read "Your leaks will show up here" directly beneath it. The body is the half carrying the honest detection threshold. ADR 0039.
- 2026-09-05: both Zero states drop their body line and their CTA becomes text only. Why: one hook is the app standard now. Dropping the scan body is safe because "Nothing uploads, ever" is restated on the scan intake screen the CTA leads to, in the onboarding beat and in the intent picker. ADR 0037.
- 2026-09-05: both Zero states carry 96pt illustrations instead of the shared 28pt ChartLine glyph. Why: This month and First scan are different questions and rendered the same mark. ADR 0036.
- 2026-09-05: `scanEmptyTitle` ("Find the leaks you already have") was left untouched in the copy pass and used as the model for every other zero state. Why: it is the only line in the app that names a benefit the user already owns rather than an action they must take.
- 2026-09-05: the book became an exploded pie chart with one slice pulled out. Why: a book means reading, and the lessons section was deleted in Phase 2, so the art advertised a feature that does not exist. The pulled slice draws the copy literally. ADR 0036.
- 2026-09-05: `monthEmptyTitle` became "See where the month went". Why: "Your first insights are a few logs away" measured the distance to value instead of naming it.
- In-card empty states (leaks, where it went, pace) stay text-only, no art. Why: an illustration inside a card competes with the card it sits in; the pane-level mark is the one that earns the space.
- Pace and Where it went carry no CTA. Why: they resolve with time and data, not with a tap, and a button there would be a lie about what the user can do.

## Open
- The This month pie is lavender, which the palette reserves for the habit arc and premium. It is the one illustration whose colour claims a meaning on a surface that does not own it. Low severity: a pie chart is unambiguous enough that the hue reads as decoration. Watch it on the device pass.

## Iterations
- 2026-09-06: both segments became a swipeable pager on `utils/useSegmentPager.ts`; `insights_view_switched` added.
- 2026-09-05: illustrations on both Zero states, `monthEmptyTitle` rewritten. ADR 0036.
