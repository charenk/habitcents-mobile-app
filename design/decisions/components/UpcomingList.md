# UpcomingList (components/money/UpcomingList.tsx)

## Direction (current)
What is coming, and what it costs. One card in three rows at the top of the pane: the window it is describing on the left with the filter that decides it in the corner, the total, then the payments count with the add affordance beside it. Below it, one row per bill, soonest first, each pressable to edit. Every number is projected by `utils/recurring.ts`; nothing on this surface is invented or rounded into a claim. Amounts render unsigned, because nothing here has been spent yet and a minus sign would read as history.

The card never changes shape. Every row renders in every state, so the window-empty case is an honest `$0.00` over `0 payments` rather than a hole where two lines used to be.

## States
Vocabulary (ADR 0034). This component owns two of Upcoming's three; the pane's true **Zero** is handled by an early return to `EmptyState`.

- Zero: no recurring expense exists at all, so the card is dropped entirely for the 96pt calendar and "Know what's coming before it lands". Reach: Persona new user.
- Window-empty: something recurs, just not inside the picked window. Card at `$0.00` / `0 payments`, one body line beneath it, no CTA. Reach: Persona returning user, then tap 2w.
- Live: the card at its total, then the rows. Reach: Persona returning user.
- Per row: default / pressed. A row whose bill lands more than once in the window also carries its multiplier.

## Decisions
- 2026-09-11 (Charen): **the card is three rows, and the window filter moved to the top-right corner.** Why: the picker used to span the full width of the card above everything, where it read as chrome bolted on top rather than as a dial on the number. Beside a sentence-case "Next 30 days" label it reads as what it is. The filter uses `SegmentedControl`'s new compact quiet tone (ADR 0040), shows `2w / 1m / 3m` and speaks "2 weeks", via the new `labelSpoken`. See [SegmentedControl](SegmentedControl.md).
- 2026-09-11: **every row of the card renders in every state, so window-empty reads `$0.00` / `0 payments`.** Why: this is a behaviour decision wearing a layout's clothes. The filter is in row 1, so a card that collapsed its total when a window came up empty would shrink **under the finger that tapped it** and shove the list up, which is a worse defect than a truthful zero. It also makes the filter legible as a live control: tap `1m` and watch `$0.00` become the real number. It falls out with no new branch and no new string, because `upcomingWindowTotal([])` is 0 and `upcomingPaymentsCount(0, 0)` already drops its "from N bills" clause when the counts agree. Rejected: hiding the total and letting the card shrink to one line, which is the old dead-white problem in a new shape. Verified on device: the card's top and bottom edges are identical across a `1m` to `2w` tap.
- 2026-09-11: **the window label is a label, not an eyebrow.** Sentence case at `typeScale.caption`, no uppercase and no 0.88 tracking, which exists to open up capitals and reads loose without them. The string never changed: casing has lived in the stylesheet since UX-060 so a screen reader hears words. Named as a deviation in the PR body, since the pane's other eyebrows stay uppercase.
- 2026-09-11: **one add affordance, not two.** The window-empty body dropped its CTA; the dashed plus sits 40pt above it and does the same thing in the same words. The true-zero state keeps its CTA, which is the only action in an otherwise empty pane.
- 2026-09-11: **the "Scheduled" eyebrow is retired.** A section heading over the only list on the pane, directly under a card that already says what the pane is. The key stays in the catalog with a dated comment; only usage retires.
- 2026-09-11: **the object is a "bill".** The pane was using four nouns for one thing (bills, repeating expenses, upcoming expense, Scheduled). "Bill" is the shortest, the most concrete, was already in the count line, and is the word a user says out loud. `upcomingWindowEmptyBody` is the one value change; the sheet's three "upcoming expense" labels move together in the drawer round.

## Open
- At the 90-day window the total renders a quarter's bills in the same 36pt serif slot that means "this month" everywhere else in the app. The label above it makes it honest; the typography still makes it feel monthly.
- Dynamic Type at XXXL is the likeliest place the corner filter breaks: three chips growing from 28pt beside a label that also grows. Not yet checked in hand.

## Iterations
- 2026-09-11: three-row card, corner filter, honest window-empty zero, one add affordance, "Scheduled" retired. ADR 0040.
