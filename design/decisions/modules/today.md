# Today (app/(tabs)/index.tsx)

## Direction (current)
Today is the core loop on one screen: log a spend in under ten seconds, see the leak, answer the check-in, watch the kept number. Two panes behind the segmented scoreboard (Spent, Kept), one 20pt gutter, a 12pt stack. Every pane state has a job; nothing on the pane exists to fill space. The canvas at `design/canvas-today-states/` is the review surface and is kept as-built (ADR 0034).

## States
Vocabulary (ADR 0034): **Zero** nothing ever happened here; **Quiet** history elsewhere, nothing today; **Live** data today. First-run ribbons and the watch nudge are overlays, not states.

- Spent Zero: chips read words (ADR 0030), quick log, centered art-title-CTA hook (a 96pt shopping bag since ADR 0036). No quote since ADR 0037. Reach: Persona new user, Door 1, close the sheet.
- Spent First log (Live overlay): log card, InfoRibbon receipt under it, then the watch nudge (needs a merchant). Reach: Door 1 with a merchant.
- Spent Quiet: honest $0.00 chip, persistent ribbon inside Today's log, no quote. Reach: returning user, delete today's rows.
- Spent Live: rows, View all, no quote.
- Kept Zero: no band, hook (a 96pt money sack since ADR 0036), Break another. No quote since ADR 0037. Kept Quiet: detection meter n of 4. Kept Live: band then Leaks found / Breaking now; check-in sub-states pending, skipped, slipped, milestone, backfill, weekly. Reach: returning user; milestone, backfill, weekly and Door 3 are canvas only.
- Sheets from Today: log, edit, pick one (and its gate), break habit, partial slip. See [drawers](drawers.md).

## Decisions
- 2026-09-05: the rotating quote is retired from both panes. Why: it did not fit the app, and the zero states read better with the hook owning the pane. Reverses ADR 0033 decision 5. ViewQuote and useViewQuote are kept unreferenced as the documented revert path, the way the dark theme and AuroraBackground are. ADR 0037.
- 2026-09-05: both Today zero states carry a 96pt illustration in place of the shared 28pt ChartLine glyph, and stay `inline` so the wrap's gap keeps the quote-to-hook spacing. Why: six surfaces rendered the same mark, so Today's Zero looked like Money's and Insights'. ADR 0036.
- 2026-09-05: Kept Zero's title is now skip-and-kept specific ("Every skip lands here as money kept"). Why: it was word-for-word `insights.leaksEmptyTitle`, so two different screens read as one. ADR 0036.
- 2026-09-04: quotes render only in a pane's Zero state, in mist. Why: with rows present the quote competed with data; in Zero it sets the tone. Rejected: keep on Spent only (panes would disagree), #B1BACB (1.9:1). ADR 0033. **REVERSED 2026-09-05: the quote is gone entirely (ADR 0037).**
- 2026-09-04: Today's empty states are icon, title, CTA. Why: the body repeated the title. ADR 0033. Extended to every empty state in the app on 2026-09-05 (ADR 0037).
- 2026-09-04: the first-run line moves under the log card, ahead of the watch nudge, as the InfoRibbon pattern; a gentle line resolves itself once a log exists and never shows in Zero (the hook says the same thing). Why: above the input it read as an instruction; a false line is worse than none. ADR 0033.
- 2026-09-04: Quiet's "A quiet day so far" is the persistent ribbon, not a white card with a body-only empty state. Why: one voice for "nothing yet" and "just logged". ADR 0033.
- 2026-09-03: chips say "No logs yet" / "No skips yet" until the activity exists. ADR 0030.
- 2026-08: Spent and Kept are two panes behind one segmented scoreboard. ADR 0019, 0021.

## Open
- The Kept SectionList scrolls under the fixed quote/band; the card gets clipped mid-scroll (seen in the 2026-09-04 walk, kept-live-slipped capture). Candidate: make the band a list header so it scrolls with the content.
- Detection names a leak "<merchant> Spending" ("Blue Bottle Spending" on the card and the pick-one sheet). Candidate: the merchant name alone.
- "Skipped it · keeps $6.50" wraps to two lines at the default text size beside a one-line "Bought it".
- Free tier at the limit: Break another routes to the paywall rather than the gated sheet the code also carries. Decide which is intended.
- The FL-1 coach slot on Kept Quiet is snow on the snow ground and reads as floating text.
- `app/(tabs)/_layout.tsx` comment and `design/redesign-handoff/04-screens.md` still describe a gear and Settings sheet.
- Door 3's ribbon still sits above the band on Kept, not inside a list section; decide whether the pattern rule applies there.

## Iterations
- 2026-09-04 d739f59: Zero-only quotes in mist, empty states without body, InfoRibbon under the log card, Quiet as the persistent ribbon, gentle-line self-resolution.
- 2026-09-04 763f0a8: Today flow states canvas, 22 artboards.
- 2026-09-03 b4cd9db, 91941bd: FTE centered zero states, chip placeholders.
