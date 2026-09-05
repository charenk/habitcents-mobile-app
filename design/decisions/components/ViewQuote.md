# ViewQuote (components/today/ViewQuote.tsx)

## Direction (current)
**RETIRED 2026-09-05 (ADR 0037). Nothing renders this.** The component and `useViewQuote` are kept unreferenced as the documented revert path, the way `constants/theme.ts` keeps the dark theme and `components/onboarding/AuroraBackground.tsx` keeps the retired aurora. Their unit tests still run.

What it was: one quote, Instrument Serif italic 20/26 in mist, centered, real curly quotes, optional attribution in mist 12.5. Present only in a pane's Zero state. Rotated per pane on activation.

## States
None reachable. It was: with / without attribution, in Spent Zero and Kept Zero.

## Decisions
- 2026-09-05: retired from both Today panes. Why: it did not fit the app, and the zero states read better with the single hook owning the pane. Reverses ADR 0033 decision 5. Rejected: keeping it on one pane only, which would have made the panes disagree the same way 0033 rejected. ADR 0037.
- 2026-09-04: text in mist (#677481). Why: settled, still 4.5:1 on snow; Charen's #B1BACB was 1.9:1. Rejected: slate (a step too dark), #B1BACB. ADR 0033.
- 2026-09-04: Zero only, both panes. ADR 0033.
- 2026-09-03: centered on both panes.

## Open
- Whether the quote register itself (`strings.today.spentQuotes` / `keptQuotes`) and the rotation counters in storage should eventually be deleted, or kept indefinitely as the revert path. Kept for now; house rule is delete nothing.

## Iterations
- 2026-09-05: unrendered from both panes; component kept as the revert path. ADR 0037.
- 2026-09-04 d739f59: mist; non-zero render sites removed.
