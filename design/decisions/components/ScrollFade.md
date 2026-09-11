# ScrollFade (components/ui/ScrollFade.tsx)

## Direction (current)
A functional edge fade for a vertical scroller: a 36pt strip pinned to the bottom of the scroller's wrapper, running from transparent to the page background, so content dissolves into the surface below instead of being sliced flat. It takes no touches and says nothing to assistive tech. Both Today panes carry one where their scroller meets the ActionDock. It is the vertical sibling of CategoryChipRow's horizontal rail fade.

## States
None of its own. Over an empty or short pane it is background over background and invisible; it only ever shows over content that reaches the scroller's end.

## Decisions
- 2026-09-11: **`edge="top"` for the other end of the same problem.** Why: a sheet body scrolling under a pinned header was sliced on the header's hairline, and a 40pt serif amount cut mid-glyph reads as a rendering fault rather than as content scrolling away (seen on the edit-bill sheet, where the taller four-section form made scrolling ordinary). Same primitive, mirrored: opaque at the edge the content disappears into, clear at the other. Grown rather than duplicated, which is the same instinct that gave SegmentedControl its second tone. The host passes the fill, because a sheet's surface is white and this component defaults to the page background. Shorter than the Today fade at 20 against 36: that one covers a 24pt end padding, this one only has to carry a glyph across a hairline, and a tall fade over a form washes out the first field.

- 2026-09-07 (Charen): a fade, not a line. Why: the dock's hairline was removed that morning because it read as a seam; without it a long Today log ended at an invisible line and the last row was cut mid-glyph. The fade says "there is more" without drawing an edge. PATTERN_VOCABULARY already allowed scroll-edge fades as functional; its wording is widened from horizontal rails to vertical scrollers.
- 2026-09-07 (Charen): always on, sized to the scroller's own end padding. Why: a fade that dissolves as the list reaches its end is nicer, and it would be the app's first scroll-driven UI, which ActionDock's record says needs its own ADR and a release-configuration boot walk while the build-5 crash stays unexplained. With 24pt of padding under the last row, a 36pt fade puts only that row's bottom 12pt under the faintest third at the very end, so it stays readable. Rejected for now, and named as the follow-up: the dissolving version on RN core `Animated.event` with the native driver.
- 2026-09-07: drawn with react-native-svg, not expo-linear-gradient. Why: the open build-5 incident's only native delta was those two modules, and only svg already renders in the launch path (every tab-bar icon). The gradient module renders today only inside things a user opens (the paywall hero, the expense sheet's chip rail). Putting it on the first screen would change which modules render at launch, which is exactly the path the incident's H1 names. Rejected: expo-linear-gradient (the obvious tool, wrong risk); a stepped stack of Views (banding).
- 2026-09-07: each instance takes its own gradient id from `useId`. Why: react-native-svg gradient ids are global across every Svg on screen, and both Today panes stay mounted with a fade each.
- 2026-09-07: the fade spans the pane width, across the 20pt gutters. PATTERN_VOCABULARY calls full-bleed a named deviation; named here. Over the gutters it is background over background, so nothing reads as full-bleed.

## Open
- Today and every sheet use it now. Money's Spent list ends against the tab bar, which draws its own top edge, so it does not need one yet; if the tab bar's edge ever goes, it will.
- Verified on the iPhone 16 simulator at default and XXXL. The gradient's look on a real display at arm's length, and Android's dashed-vs-gradient rendering, are owed a device pass.

## Iterations
- 2026-09-07: created; Today's three scrollers (Spent, Kept zero, Kept list) wrapped.
