# SegmentedControl (components/ui/SegmentedControl.tsx)

## Direction (current)
One physical switch, not two buttons: a cloud track with a single white raised thumb, so the selected segment is the only white surface. Labels are 13/600, ink when selected and slate when not, so state survives without relying on fill alone. A segment may carry one optional badge, a short word annotating a destination that is not live yet. No motion: the thumb is the selected segment's own background and swaps instantly, deliberately, so it never competes with the sheet and toast motion the spec budgets.

Nesting rule shared with SpentKeptChips: track radius = thumb radius + track padding (14 + 3 = 17).

A second tone exists for one job (ADR 0040): compact and quiet, for a filter that lives inside the card it filters. It draws no track and fills the selected segment instead, which is the same switch with its figure and ground swapped rather than a new control. Everything semantic is shared: tablist/tab roles, the selection haptic and its real-change guard, instant swaps, one label per segment.

## States
Per segment: selected / unselected / pressed-unselected. With or without a badge; badged segments appear on Insights (Leak finder, "Soon"). Reach: Money tab for the plain form, Insights tab for the badged one, Money > Upcoming's total card for the compact quiet one.

## Decisions
- 2026-09-11 (Charen): **a compact trackless tone, for a filter that lives inside the card it filters.** Why: Upcoming's window picker spanned the full width of the card at the top, where it read as chrome bolted above the number rather than as a control over it. Moving it to the card's top-right corner made the shape the problem: the card is already the raised white surface, so a cloud track holding a white thumb is a panel inside a panel. The tone inverts the fill instead, so the selected segment is the only filled surface the way it is otherwise the only white one. **Not a third switcher**, in the same sense `SegmentPager` was not a new control: one component, one set of roles, one haptic rule, two style branches. Rejected: a bespoke compact chip row, which is exactly UX-037's mistake (SpendPulse rolled one, lost tablist/tab semantics, and was forced back onto this component). The guard rail is in the tone's name and in PATTERN_VOCABULARY: quiet is for filters inside their own card, never for switching between views. ADR 0040.
- 2026-09-11: **`labelSpoken`, so a segment can abbreviate on screen without abbreviating for VoiceOver.** Why: the window filter shows "2w" in 44pt of corner, and "2w, selected" is not a sentence. Same contract as the existing `badgeSpoken`, and it composes ahead of it, so a segment carrying both reads "Leak finder, coming soon, selected". It also means every assertion that queries this control by accessible name kept working when the visible labels shortened, which is how the change stayed provably non-breaking for the other six hosts.
- 2026-09-10: **selecting a segment fires `hapticSelection`.** Why: an audit on 2026-09-10 found 21 of the app's 27 haptic calls were `hapticError` and `hapticSelection` fired in exactly one place (the paywall's plan cards), so the product touched you almost only to say you were wrong. A switch is the most-repeated gesture in the app and answered with nothing at all. Guarded on a real change: re-pressing what is already selected does nothing, so buzzing for it would be the control lying about what happened. No motion is added; thumb swaps stay instant by house rule, and haptics keep firing under reduced motion by design (`utils/motion.ts`). Pinned by `__tests__/selectionHaptics.test.tsx`, which asserts the guard by call count rather than the call.
- 2026-09-05: segments take an optional `badge` plus a `badgeSpoken` override, composed into the tab's own spoken label rather than announced separately. Why: Insights' Leak finder is a real destination whose flow is dormant, and setting that expectation before the tap is more honest than after it. One VoiceOver stop, not two, because the badge is part of what the tab IS: it reads "Leak finder, coming soon, selected". Decision 0009.
- 2026-09-05: the badge pill is white on an unselected segment and cloud on the selected one, and its meaning is always in the word. Why: the selected segment is itself white, so a white pill would vanish on it; and colour alone never carries meaning here, the same rule TierBadge follows.
- 2026-09-05: `minHeight` on the pill, never a fixed height, and segment padding drops 12 to 10. Why: the 11pt label scales with Dynamic Type and a fixed box clips it (the lesson TierBadge learned first); the 2pt of padding buys the room a badged segment needs before the label starts truncating.
- 2026-08-16 (Charen): the family moved off the stadium shape onto the rounded-rect radius family, matching SpentKeptChips and Charen's mock of all three tab styles.
- UX-030: `hitSlop` of 3pt top and bottom lifts the 38pt segment to the 44pt target floor without changing the visual, using the headroom the track's own padding leaves.

## Open
- Its internal badge geometry is now duplicated by Upcoming's cadence badge (2026-09-11). Two hosts, one shape; a third makes `ui/Badge` worth extracting, and both sites should move together when it is.
- Only two of the four size/tone pairs are drawn: default+track and compact+quiet. A compact tracked control and a full-size trackless one have no host and no design; treat the two props as one choice until they do.
- The badge slot is default-size-only in practice. Its width math was already fragile at 38pt (see below) and has never been drawn inside a 28pt segment; a compact badged segment needs a layout, not just a render.
- Two badged segments in one control has never been drawn. The width math only works because exactly one segment carries a pill; if a second ever wants one, the layout needs re-thinking rather than another prop.

## Iterations
- 2026-09-11: compact quiet tone and `labelSpoken`; no call-site changes, the other six hosts render identically. ADR 0040.
- 2026-09-05: optional badge slot, spoken-label composition, segment padding 12 to 10. Decision 0009.
