# ExpenseRow (components/money/ExpenseRow.tsx)

## Direction (current)
One row shape for a logged spend, shared by Today's logged-today list and Money > Spent, so the same expense never looks like two different objects. A 36pt EmojiTile for identity, the name and a secondary line stacked beside it, the amount right-aligned in tabular figures. Amounts render unsigned: every row here is a spend, so a minus sign carried no information.

At the five iOS accessibility text sizes the row stops being a row. The name and the amount are both things the user came to read, so neither may be capped, and at AX3 they each want roughly 43pt type in a 393pt row. Stacked, both get the full width.

## States
- Default / pressed (pressed only when the row has an `onPress`; Today's list is read-only).
- Recurring: a `Repeat` glyph in the trailing area, and the word spelled out in the row's accessible label, so the meaning survives VoiceOver (ADR 0024).
- Side-by-side (up to XXXL) and stacked (AX1 and above). Reach: `xcrun simctl ui <udid> content_size accessibility-extra-extra-extra-large`, then COLD-LAUNCH; a running app does not pick the setting up fully.

## Decisions
- 2026-09-11: **the row draws the bill's own glyph when it has one.** `expenseGlyph(expense)` rather than `categoryEmoji(expense.category)`, at this site and at `UpcomingList`'s row, which are the only two places an expense's glyph is drawn. The tile is unchanged: it has always taken an opaque string. See [AddUpcomingSheet](AddUpcomingSheet.md) for the picker and the reasoning.

- 2026-09-11: **at accessibility text sizes the row stacks: name, then the secondary line, then the amount, with the tile top-aligned beside the name.** Why: side by side at AX3 the merchant read "S.." and the time read "1...". ADR 0039 had already given the amount `flexShrink` plus `adjustsFontSizeToFit` with a 0.7 floor, which is the correct answer up to XXXL and simply runs out of room past it: 70% of a 43pt amount is still 30pt, leaving the name about two characters. Capping either one would invert the house rule, because both are content. Rejected: capping the name at 1.5 (it is the thing that identifies the row), and `numberOfLines={1}` tuning (a one-line clamp on text that has outgrown its line box crops it rather than shrinking it, which is how the count line on Upcoming's card broke the same week). The name gets two lines when stacked so a long merchant finishes its word. The secondary line is metadata and caps. See [textScale](../../../utils/textScale.ts) and PATTERN_VOCABULARY's Accessibility section.
- 2026-09-11: **`EmojiTile`'s glyph stops scaling.** The tile is a fixed-size identity chip, not text, so a glyph that grew with Dynamic Type overflowed its own box: an 18pt emoji rendered near 42pt inside a 36pt tile and clipped to a sliver. It is the only `allowFontScaling={false}` in the app, and it is defensible precisely because nobody reads it: everything a user reads still scales.

## Open
- The threshold is a single boundary, so AX1 through AX5 all get the same stacked layout. AX5 (3.12x) has only been eyeballed at AX3; if it needs more (a smaller tile, say) that is a second decision, not a tweak to this one.
- Not checked on Android, where Dynamic Type maps differently and RN does not forward the same scale information (the ADR 0039 review found this for tab labels).

## Iterations
- 2026-09-11: accessibility-size reflow; EmojiTile glyph scaling off. Applied in the same pass to `HabitLeakRow`, `WhereItWentCard` and `UpcomingList`'s rows, which share the shape.
