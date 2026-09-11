# CheckInCard (components/habit-logging/CheckInCard.tsx)

## Direction (current)
The answer card, identical on Today and habit detail, carrying only the
loop: cue (bare habit name + week strip), action (one question, "Skipped ·
+$X" primary / "Bought it"), reward (one confirmation line). Daily: week
strip with green $ kept-days (the one dot language, 2026-09-10) and the
plain-count summary "N skips this week · $X kept". Weekly or monthly:
cadence pill, period chip, one "Skipped one · +$X" button. Answered: badge
(sage check for a skip, cloud minus for a slip), ONE headline, coach slot,
and one correction link per state - Change answer on a skip, Spent less
than usual? on a slip, nothing on a partial (change-answer for a slip lives
on the detail calendar). Backfill pair when yesterday is open, once ever;
no permanent yesterday line afterwards - the strip dot is the record.
History, totals, and the chapter arc stay on the detail screen. The one
playful motion in the app lives on the skip confirmation.

## States
pending, skipped, slipped, partial, milestone (lavender slot), backfill offered / used, weekly with or without today's confirmation, first run line.

## Decisions
- 2026-09-11 (Charen, annotation set 2): the card sheds its dashboard and
  correction jobs - one fact per line. Plain counts replace "N of M days"
  (M was days-answered, so the first answer read "1 of 1 days" like a met
  target; ADR 0004 wording amendment). Buttons shorten to "Skipped · +$X" /
  "Bought it" (past tense stays: the check-in is a report). The week dot
  glyph is the white $ on sage - green $ = money kept, anchored by the bare
  habit name (the " Spending" suffix died in detection).
- ADR 0004: week rhythm, chapters at 10/30/50/66 total skips, slips never subtract.
- ADR 0027: white on sage for the skip badge.
- Answers stack past 1.3 font scale.

## Open
- (resolved 2026-09-11: the wrap went with the shorter "Skipped · +$X" label.)
- Cards scroll under the fixed kept band (see KeptHero). **Moot since 2026-09-07: the band is gone from Today; the list now scrolls between the chips and the dock, and fades into the dock (ScrollFade).**

## Iterations
- 2026-09-11: annotation-set-2 simplification (dollar dots, plain counts, one-line confirmations, one link per state, yesterday line dropped).
