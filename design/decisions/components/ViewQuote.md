# ViewQuote (components/today/ViewQuote.tsx)

## Direction (current)
One quote, Instrument Serif italic 20/26 in mist, centered, real curly quotes, optional attribution in mist 12.5. Present only in a pane's Zero state. Rotates per pane on activation (`useViewQuote`).

## States
With / without attribution. Rendered only in Spent Zero and Kept Zero.

## Decisions
- 2026-09-04: text in mist (#677481). Why: settled, still 4.5:1 on snow; Charen's #B1BACB was 1.9:1. Rejected: slate (a step too dark), #B1BACB. ADR 0033.
- 2026-09-04: Zero only, both panes. ADR 0033.
- 2026-09-03: centered on both panes.

## Open
- None.

## Iterations
- 2026-09-04 d739f59: mist; non-zero render sites removed.
