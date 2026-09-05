# EmptyState (components/ui/EmptyState.tsx)

## Direction (current)
The one empty-state primitive: an optional mark, optional title, optional body, an optional ordered steps list (one caller), and an optional sage text CTA (`tertiaryBrand`, ADR 0038), in a 12pt centered stack. Every pane-level zero state is exactly three things: art, one hook line, a text link. The mark is either a 96pt illustration (`illustration`, named from `constants/emptyArt.ts`) or a 28pt slate icon (`icon`); a state names one, never both. `inline` leaves the container to the caller; `fill` adds the default icon and pane padding. On Today the pattern is mark, title, CTA and nothing else.

## States
With or without each part; inline / fill; art or glyph.

## Decisions
- 2026-09-05 (review): each step row is ONE accessible element, numeral composed into its label ("1. Log what...") and keyed by index. Why: two bare Texts read as two VoiceOver stops per step, six for three lines, and a text key would collide if a locale ever repeats a line. Matches ExpenseRow's row idiom. ADR 0039 review.
- 2026-09-05: `steps` and `stepsTitle` add an ordered explainer between the hook and the CTA, with exactly one caller. Why: Today's Kept true-zero is the only state in the app where the user has no evidence of their own to read, so the mechanic has to be told rather than shown. The list is left-aligned against the rest of the centered stack, because centred numerals stop reading as a list. Numerals come from the index, so copy never carries "1." and a translation cannot renumber. ADR 0039.
- 2026-09-05: every empty state is one line, not two. The six pane-level bodies are gone; the app standard is a single hook. Why: the body either restated the title or explained a control the CTA already offers. Closes the open question this file has carried since 2026-09-04. ADR 0037.
- 2026-09-05: the CTA is text only. Why: beside 96pt art and one hook, a bordered pill was the heaviest thing in a pane meant to read quiet; the 44pt target and the PRD's concrete-first-action rule both hold. ADR 0037. **Superseded same day on colour by ADR 0038:** the variant is `tertiaryBrand` (sage), because slate made the pane's only action its quietest element.
- 2026-09-05: pane-level zero states carry a 96pt 3D illustration instead of a shared 28pt glyph. Why: seven surfaces rendered the identical `ChartLine` mark, so the states read as interchangeable and none felt like the place it was. Rejected: distinct lucide glyphs per surface, which fixes sameness but not flatness. ADR 0036.
- 2026-09-05: `illustration` is layout-independent, not gated on `fill`. Why: Today's two zero states are deliberately `inline` (their own wrapper centres the hook between the chips and the dock), so a layout gate would have left Today on 28pt beside 96pt siblings, reviving the two-scale drift this primitive exists to end.
- 2026-09-05: art and glyph share `testID="empty-state-icon"`; the art adds `empty-state-art`. Why: the pinned contract is "a zero state carries a visual mark", which both branches satisfy, so swapping one for the other cannot silently drop the mark.
- 2026-09-05: the art is decorative and hidden from assistive tech. Why: the title and CTA already carry every word a screen reader needs, matching EmojiTile's decorative mode and the glyph it replaced.
- 2026-09-05: `fill`'s `ChartLine` default is kept though every fill caller now names its own mark. Why: same reasoning as `Icon.tsx`'s FALLBACK_GLYPH, a missing mark must degrade to something rather than to a hole.
- 2026-09-04: `body` is optional; Today's two zero states pass none. Why: the body repeated the title; Money, Insights and Categories keep theirs for now. ADR 0033.
- Empty-state unification pass: one primitive replaces four treatments.

## Open
- The `steps` slot is a deliberate exception, not an opening. If a second caller appears, the one-hook rule is the thing under pressure and it should be re-argued, not quietly widened.
- `today-kept` is the last placeholder. It is blue and gold while kept is sage everywhere else, including the chip label directly above it, and at 96pt it reads as a blue ball with an orange ribbon because the gold speckle becomes noise. Seen 2026-09-05 on Today, Kept Zero. A stack of coins (which depicts accumulation, as the kept counter does) or a piggy bank would fix both problems; a green variant would be better still, since kept is the one concept in this app that owns a colour and no illustration currently honours it.
- Rejected for this slot, 2026-09-05: a leather wallet with cards. The Money tab's own icon is a wallet (`app/(tabs)/_layout.tsx`), so it would point at another tab from directly above that tab's icon; cards fanned out is the gesture of paying, not of keeping; and a wallet cannot show accumulation.
- Dynamic Type: verified 2026-09-05 at accessibility-extra-extra-extra-large on the iPhone 16 simulator. The art holds 96pt while the body grows uncapped; Today's Spent Zero and Money's Spent Zero both keep art, title, body and CTA on screen with room to spare. Fixing the art's size is what makes that work, since art that grew with the text would push the CTA off. Still owed a real device pass with VoiceOver.

## Iterations
- 2026-09-05: `illustration` prop, `constants/emptyArt.ts` registry, seven zero states moved off `ChartLine`. ADR 0036.
- 2026-09-04 d739f59: body optional; `spentEmptyBody` and `keptEmptyBody` removed.
