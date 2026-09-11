# LeakRow (components/habit-logging/LeakRow.tsx)

## Direction (current)
One merchant in Today's Leaks section, two densities. Candidate (2+ logs in
the detection window, not yet a habit): tile, name, the last-7-days evidence
strip, "$X so far · N buys". No action and no threshold number - the row is a
nudge that fills as the pattern forms. Detected: the same row grown up -
bigger name, the evidence sentence detection stands behind, Break it / Not
this one as real buttons, DT-1 under the first detected row. Evidence dots
are NEUTRAL: mist $ on cloud for a day with a buy (green stays
positive-only; the green $ belongs to kept days on WeekStrip). The row draws
no card chrome; Today wraps detected rows in their own card and stacks
candidates in one shared card with hairline separators, capped at three.

## States
Candidate; detected observed-only (evidence + keep-logging hint); detected
with a reliable rate; detected with the DT-1 coach note; break-again label
when a stopped habit is re-offered.

## Decisions
- 2026-09-11 (Charen, annotation set 3): replaces both the "Spotting your
  leak" meter and LeakCard. The meter's "n of 4" promise could not be kept -
  detection's confidence and $20/month floors meant a full bar could sit
  forever over "keep logging", and dismissing the only leak landed there
  permanently. Candidates carry evidence instead of a promise and graduate
  in place; a single log shows nothing. Detection math unchanged.
- 2026-09-11: no disabled Break on candidates (a permanently disabled button
  on every row is noise; the action appears when it is real) and no
  swipe-to-ignore (crash-containment line, utils/useSegmentPager.ts; the
  spec bans swipe-only actions). Dismissal stays the Not this one button
  with its Undo toast, and a dismissed merchant never returns as a
  candidate.

## Open
- Candidate tile glyph is the generic category emoji; a merchant-aware glyph
  needs a mapping that does not exist yet.

## Iterations
- 2026-09-11: first version, from the Habit card states canvas (Leak funnel page).
