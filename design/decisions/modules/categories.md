# Categories (app/(tabs)/categories.tsx)

## Direction (current)
The buckets spending falls into, and the only tab that ships populated. Default categories are seeded at first run, so the list is never empty in practice. Identity is an emoji in a tinted tile, not an icon (see the tokens handoff); the tint is the category's own colour at 12 percent.

## States
- Zero: no categories at all. Pane-level empty state with the `Folder` glyph, "Group spending your way". **Unreachable with shipped defaults**; it exists for the case where a user deletes every category.
- Live: Default and Custom sections, each row an emoji tile plus a name.
- Loading: "Loading."

## Decisions
- 2026-09-05: the Zero state drops its subtitle and its CTA becomes text only. Why: one hook is the app standard now. ADR 0037.
- 2026-09-05: Categories keeps the 28pt `Folder` glyph while the other seven zero states moved to 96pt illustrations. Why: the state cannot be reached while default categories ship, so it does not earn an asset in the bundle, and the idiom mix is invisible to real users. Revisit if defaults ever stop shipping. ADR 0036.
- 2026-09-05: `emptyTitle` became "Group spending your way" and the subtitle became "Buckets make the patterns easier to see." Why: the copy pass moved every zero state off reporting an absence. ADR 0036.
- `emptyCta` ("Add your first category") stays textually distinct from the header's "Add category". Why: both buttons are on screen together in the empty state, and two controls with the same name is a needless ambiguity for anyone navigating by button. Pinned by a test.
- The subtitle must not narrate a control the CTA already offers; it previously read "Tap Add category at the top". Pinned by a test that rejects the word "tap".

## Open
- If Categories ever ships without defaults, this Zero state becomes reachable and wants art to match its siblings: stacked folders or labelled boxes.

## Iterations
- 2026-09-05: Zero copy rewritten, glyph deliberately retained. ADR 0036.
