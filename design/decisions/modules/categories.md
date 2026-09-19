# Categories (app/(tabs)/categories.tsx)

## Direction (current)
The buckets spending falls into, and the only tab that ships populated. Default categories are seeded at first run, so the list is never empty in practice. Identity is an emoji in a tinted tile, not an icon (see the tokens handoff); the tint is the category's own colour at 12 percent.

## States
- Zero: no categories at all. Pane-level empty state with the `Folder` glyph, "Group spending your way". **Unreachable with shipped defaults**; it exists for the case where a user deletes every category.
- Live: Default and Custom sections, each row an emoji tile plus a name.
- Loading: "Loading."

## Decisions
- 2026-09-12 (localization routine, correcting the entry below): the earlier `numberOfLines={1}` on `statBandAmount`/`statValue` was wrong, not just incomplete. Those two are content (the amount, the log count), which `utils/textScale.ts`'s "chrome caps, content does not" rule (landed on main 2026-09-11, after this routine's original pass started but before it shipped) says must never be line-capped; cropping it at the accessibility text sizes is the exact anti-pattern that file's header calls out. Fixed the way `components/money/ExpenseRow.tsx` and `components/insights/WhereItWentCard.tsx` already do it: `useAccessibilityTextSize()` stacks the three columns into one at the five accessibility sizes (`statBandStacked`/`statBandColStacked`, dividers hidden while stacked) instead of competing for width, and the `numberOfLines={1}` cap moved onto the two metadata elements it always belonged on (`statBandLabel`, `summaryTrendText`), now paired with `maxFontSizeMultiplier={CHROME_MAX_FONT_SCALE}` like every other capped label in the app. The German/French length concern the original entry was solving for is still covered: at the default text size the columns are still side by side and the labels still take one line. Pinned by `__tests__/dynamicType.test.tsx`'s new "category detail stat band" cases.
- 2026-09-12 (localization routine, overflow hardening, `app/category/[id].tsx`), superseded above same day: the stat band's three columns (`statBandAmount`, `statValue`, `statBandLabel`, `summaryTrendText`) all took `numberOfLines={1}`. Why: three narrow hairline-divided columns with a design comment already flagging the trend caption needs the room to stay on one line at the default type size; a longer translated label or trend caption must truncate rather than wrap and break the three-column alignment. No test asserted multi-line before this; no test change needed.
- 2026-09-11 (QA loop): **an expense belongs to exactly one category.** Why: `expenseBelongsToCategory` is an OR ladder, and every custom category writes 'Other' as the row's stored value, so a custom-category expense matched its own category by id AND the default 'Other' by name. Both this screen and category detail called it inside a per-category `.filter()`, so the same dollars were counted in both rows, and Insights (repaired in PR #161) disagreed with both. The resolution PR #161 built is now the shared `resolveExpenseCategory`, and all three surfaces resolve each row to one category before bucketing. On category detail the fan-out was wider than the reported total: the log count, the average, top merchants and every bar of the six-month trend derive from the same array and were all inflated. `expenseBelongsToCategory` keeps its membership job and its docblock now says it must not be used to partition. Pinned by `__tests__/categoryPartition.test.ts`, whose partition property is the test that would have caught this. QA finding 14.
- 2026-09-07 (Charen): the Zero state centres in the pane like every other one, and the scroll content reads `layout.paneContentTop`. Unreachable while defaults ship, kept honest anyway so it does not become the one top-anchored outlier the day it is reached.
- 2026-09-05: the Zero state drops its subtitle and its CTA becomes text only. Why: one hook is the app standard now. ADR 0037.
- 2026-09-05: Categories keeps the 28pt `Folder` glyph while the other seven zero states moved to 96pt illustrations. Why: the state cannot be reached while default categories ship, so it does not earn an asset in the bundle, and the idiom mix is invisible to real users. Revisit if defaults ever stop shipping. ADR 0036.
- 2026-09-05: `emptyTitle` became "Group spending your way" and the subtitle became "Buckets make the patterns easier to see." Why: the copy pass moved every zero state off reporting an absence. ADR 0036.
- `emptyCta` ("Add your first category") stays textually distinct from the header's "Add category". Why: both buttons are on screen together in the empty state, and two controls with the same name is a needless ambiguity for anyone navigating by button. Pinned by a test.
- The subtitle must not narrate a control the CTA already offers; it previously read "Tap Add category at the top". Pinned by a test that rejects the word "tap".

## Open
- If Categories ever ships without defaults, this Zero state becomes reachable and wants art to match its siblings: stacked folders or labelled boxes.

## Iterations
- 2026-09-12: stat band reflows to one column at the accessibility text sizes instead of cropping the amount/count; `numberOfLines={1}` narrowed to just the two metadata labels, now capped at 1.5 (corrects the same-day entry below).
- 2026-09-12: stat band columns take `numberOfLines={1}` (overflow hardening, category detail).
- 2026-09-05: Zero copy rewritten, glyph deliberately retained. ADR 0036.
