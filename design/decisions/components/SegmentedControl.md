# SegmentedControl (components/ui/SegmentedControl.tsx)

## Direction (current)
One physical switch, not two buttons: a cloud track with a single white raised thumb, so the selected segment is the only white surface. Labels are 13/600, ink when selected and slate when not, so state survives without relying on fill alone. A segment may carry one optional badge, a short word annotating a destination that is not live yet. No motion: the thumb is the selected segment's own background and swaps instantly, deliberately, so it never competes with the sheet and toast motion the spec budgets.

Nesting rule shared with SpentKeptChips: track radius = thumb radius + track padding (14 + 3 = 17).

## States
Per segment: selected / unselected / pressed-unselected. With or without a badge; badged segments appear on Insights (Leak finder, "Soon"). Reach: Money tab for the plain form, Insights tab for the badged one.

## Decisions
- 2026-09-05: segments take an optional `badge` plus a `badgeSpoken` override, composed into the tab's own spoken label rather than announced separately. Why: Insights' Leak finder is a real destination whose flow is dormant, and setting that expectation before the tap is more honest than after it. One VoiceOver stop, not two, because the badge is part of what the tab IS: it reads "Leak finder, coming soon, selected". Decision 0009.
- 2026-09-05: the badge pill is white on an unselected segment and cloud on the selected one, and its meaning is always in the word. Why: the selected segment is itself white, so a white pill would vanish on it; and colour alone never carries meaning here, the same rule TierBadge follows.
- 2026-09-05: `minHeight` on the pill, never a fixed height, and segment padding drops 12 to 10. Why: the 11pt label scales with Dynamic Type and a fixed box clips it (the lesson TierBadge learned first); the 2pt of padding buys the room a badged segment needs before the label starts truncating.
- 2026-08-16 (Charen): the family moved off the stadium shape onto the rounded-rect radius family, matching SpentKeptChips and Charen's mock of all three tab styles.
- UX-030: `hitSlop` of 3pt top and bottom lifts the 38pt segment to the 44pt target floor without changing the visual, using the headroom the track's own padding leaves.

## Open
- Two badged segments in one control has never been drawn. The width math only works because exactly one segment carries a pill; if a second ever wants one, the layout needs re-thinking rather than another prop.

## Iterations
- 2026-09-05: optional badge slot, spoken-label composition, segment padding 12 to 10. Decision 0009.
