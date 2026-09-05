# ActionDock (components/today/ActionDock.tsx)

## Direction (current)
The one place Today's panes put their action. A full-width strip at the bottom of each pane: 20pt gutter, 12pt above and below, a 1px cloud top edge, background fill. Spent fills it with the quick-log card; Kept fills it with the break-habit affordance. It does not move, does not float, and does not hide.

## States
It has none of its own. The contents change, the container does not, which is the point: the action holds its position while the pager swipes between panes.

## Decisions
- 2026-09-05: both Today panes end in this dock. Why: Spent kept the quick log as its scroller's FIRST child and Kept put its affordance LAST, so swiping moved the action from the top of the screen to the bottom of a long scroll, and a populated Kept pane hid the affordance behind every leak and check-in card. Also executes CLAUDE.md's own "primary actions in thumb zone (bottom 40%)". ADR 0038.
- 2026-09-05: a flex sibling, not an absolutely positioned bar. Why: the pane is a column, the scroller takes flex 1 and this sits after it, so nothing can hide underneath and no offset arithmetic against the tab bar is needed. Rejected: position absolute with the Toast offset formula, which buys nothing and adds a z-index.
- 2026-09-05: no bottom safe-area padding. Why: the tab bar below already reserves the inset and draws its own top border; adding either here doubles them.
- 2026-09-05: **it does not hide on scroll**, though that is what was asked for. Why, specifically: there is no scroll-driven UI anywhere in this app; a smooth version needs the first `react-native-reanimated` import while an unexplained release-only launch crash is open; the toast occupies this exact band and fires on the save this dock performs; the sanctioned entrance travel is 8-12pt against a bar height near 80; and sliding surfaces were rejected twice, most recently ADR 0037. A composer stays put. Revisit needs its own ADR plus a Release-configuration boot walk.
- 2026-09-05: geometry copied from the leak-scan footers rather than invented, so this is a re-use of existing chrome grammar.
- 2026-09-05: it reports its measured height so the screen can lift the toast clear of it. Measured, not derived: the quick-log card and the habit affordance are different heights.

## Open
- Only Today uses it. Money's Spent segment is the app's longest list and has no quick log at all; whether it earns one is a separate question.
- The dock costs vertical space on every Today state, including ones with nothing to scroll. Worth a look at arm's length before deciding it is free.
- iPad (routine/ipad, unmerged): that branch caps content per scroller at a 600pt column and deliberately not per pane, so this dock would render full width under the centred column, the quick-log card stretched to ~984pt on a 1024pt iPad. Same shape as the un-capped leak-scan/paywall footers already sitting in Charen's footer-cap decision on the status board; the dock belongs in that decision, not in a fix here. Only live once supportsTablet flips.

## Iterations
- 2026-09-05: created; both Today panes migrated onto it. ADR 0038.
