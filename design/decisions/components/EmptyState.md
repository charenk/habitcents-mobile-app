# EmptyState (components/ui/EmptyState.tsx)

## Direction (current)
The one empty-state primitive: an optional mark, optional title, optional body, optional secondary CTA, in a 12pt centered stack. The mark is either a 96pt illustration (`illustration`, named from `constants/emptyArt.ts`) or a 28pt slate icon (`icon`); a state names one, never both. `inline` leaves the container to the caller; `fill` adds the default icon and pane padding. On Today the pattern is mark, title, CTA and nothing else.

## States
With or without each part; inline / fill; art or glyph.

## Decisions
- 2026-09-05: pane-level zero states carry a 96pt 3D illustration instead of a shared 28pt glyph. Why: seven surfaces rendered the identical `ChartLine` mark, so the states read as interchangeable and none felt like the place it was. Rejected: distinct lucide glyphs per surface, which fixes sameness but not flatness. ADR 0036.
- 2026-09-05: `illustration` is layout-independent, not gated on `fill`. Why: Today's two zero states are deliberately `inline` (fill's 40pt top padding is their quote-to-hook gap), so a layout gate would have left Today on 28pt beside 96pt siblings, reviving the two-scale drift this primitive exists to end.
- 2026-09-05: art and glyph share `testID="empty-state-icon"`; the art adds `empty-state-art`. Why: the pinned contract is "a zero state carries a visual mark", which both branches satisfy, so swapping one for the other cannot silently drop the mark.
- 2026-09-05: the art is decorative and hidden from assistive tech. Why: the title and CTA already carry every word a screen reader needs, matching EmojiTile's decorative mode and the glyph it replaced.
- 2026-09-05: `fill`'s `ChartLine` default is kept though every fill caller now names its own mark. Why: same reasoning as `Icon.tsx`'s FALLBACK_GLYPH, a missing mark must degrade to something rather than to a hole.
- 2026-09-04: `body` is optional; Today's two zero states pass none. Why: the body repeated the title; Money, Insights and Categories keep theirs for now. ADR 0033.
- Empty-state unification pass: one primitive replaces four treatments.

## Open
- Decide whether Money's, Insights' and Categories' empty states drop their body too.
- Three illustrations are placeholders and want replacing (ADR 0036). Seen on the simulator walk, 2026-09-05: `money-upcoming` is a calculator under copy about a next date, the clearest mismatch of the seven; `insights-month` is a book under "See where the month went", where a pie or bar chart belongs; `money-habits` is a dartboard where a dripping tap would name the product's own word. Swapping one is a file replacement in `assets/empty-states/`, no call site changes.
- The kept illustration is blue and gold while kept is sage everywhere else, including the chip label directly above it. Seen 2026-09-05 on Today, Kept Zero. Recolour if the source allows.
- At 96pt the kept sack reads as a blue ball with an orange ribbon; its gold speckle becomes noise. Busiest render in the set.
- Dynamic Type: the art is a fixed 96pt square above uncapped body text. Deliberate, so the CTA is not pushed off screen at the largest sizes, but it has not had a device pass at 200 percent.

## Iterations
- 2026-09-05: `illustration` prop, `constants/emptyArt.ts` registry, seven zero states moved off `ChartLine`. ADR 0036.
- 2026-09-04 d739f59: body optional; `spentEmptyBody` and `keptEmptyBody` removed.
