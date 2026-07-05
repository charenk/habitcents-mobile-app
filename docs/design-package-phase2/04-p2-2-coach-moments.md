# P2-2 Coach Moments

- **Date:** 2026-07-04
- **Status:** component + copy spec, written against Direction C tokens
- **Sources:** `habitcents-design-scope-phase2.md` section 5.3, `types/habit.ts` (the 7 micro-lessons, the source psychology), `constants/strings.ts`, `01-habit-logging-spec.md` sections 4.4 to 4.6 (the slot the card mounts in, the chapter system)
- **Companion board:** `prototypes/Coach Moments Options.html` (card-treatment options, the trigger matrix, recommendation)
- **Removal note:** this feature replaces the lessons library (D-5). The `MICRO_LESSONS` array and the Habits-tab "Learning" section are removed; their psychology is redistributed into the copies below.

---

## 1. Principles

1. **The product's voice at the moment of action, not a destination.** A Coach Moment appears inside the check-in confirmation slot the instant an answer is recorded. There is no lessons tab to visit.
2. **Never a toast, never a modal.** It is a quiet card that occupies layout below the confirmation line. It never floats, never blocks, never times out mid-read, and never covers the primary action.
3. **Once per triggering event.** Each card copy renders once for the event that triggers it; it does not repeat on re-open of the same answered state.
4. **One or two sentences, product vocabulary.** Leak / skip / kept / slip, sentence case, no em dashes. Identity beats at chapter crossings.
5. **It never argues with a slip.** Slip-trigger cards are recovery, never scolding. Missing is framed as normal and recoverable.
6. **Structural analytics only.** Each render fires `coach_moment_shown {trigger, cardId}`; no amounts, no merchant or habit names.

## 2. Card component

Mounts in the confirmation slot (`01` §4.5), below the confirmation line, above the Change-answer link.

- **Idle (default) treatment:** full-width card, `#F8F8F8` fill, 12px radius, 14pt `#616161` text, 12px padding, a small leaf glyph at the leading edge. No border, no shadow (it recedes; the confirmation line above it leads).
- **Milestone (chapter-crossing) treatment:** same slot, `#B2DFB6` at 30% tint, plus a bold headline line above the card: "{total} skips · {chapter name}". The card body carries the identity copy.
- **States:** entering (fade + 7px rise, 220ms, C's confirm motion), idle (static), dismissed (removed on next visit; no X, no manual dismiss). Reduced motion: appears instantly.
- **Never:** a close button, a "next lesson" affordance, a progress indicator, or a link out. It is terminal and calm.

## 3. Trigger matrix

Five triggers (per D-5), each with its card pool and selection rule. When multiple could fire, priority is: milestone > recovery (slip after a run) > first-time > default rotation.

| Trigger | Fires when | Selection | Cards |
|---|---|---|---|
| First log | the first expense ever is saved (onboarding or Expenses) | fixed | FL-1 |
| Detection | a leak is first surfaced (detection or scan) | fixed | DT-1 |
| Skip | a skip is recorded | first-ever uses SK-0; else rotate SK-1..SK-6, no repeat until pool exhausts | SK-0..SK-6 |
| Milestone | total skips cross 10 / 30 / 50 / 66 (chapter change) | keyed to threshold | MS-10, MS-30, MS-50, MS-66 |
| Broken streak | a slip follows 3+ consecutive skips; or any slip (lower-priority) | run-break uses BR-1; plain slip rotates BR-2..BR-4 | BR-1..BR-4 |

- "Milestone" here means the v2 chapter crossing on **total skips** (`01` §4.6), not the old skips-in-a-row markers. The four cards map to Rhythm / Cruising / Rewiring / Rewired.
- Each card is once-per-event: MS-30 fires the single time total skips crosses 30, never again.

## 4. The copy set (~20 cards)

Sourced from the 7 micro-lessons (habit loop, the four laws, identity, 2-minute rule) rewritten into one- or two-sentence moments in HabitCents vocabulary.

### First log
- **FL-1:** "That took about ten seconds. Do this a few more times and we'll show you the habit quietly costing you the most."

### Detection
- **DT-1:** "Here's your leak. You don't have to quit it, just decide, one day at a time, whether it's worth it."

### Skip
- **SK-0** (first skip ever): "Your counter is running. Every skip from here is money you decided to keep."
- **SK-1:** "The urge passes in a few minutes. The money you kept stays all day." *(craving / delay)*
- **SK-2:** "You didn't resist a purchase. You chose where your money goes. That's the whole game." *(identity)*
- **SK-3:** "Skipping is easier the second time, and easier again the third. You're wearing a new path." *(routine / repetition)*
- **SK-4:** "Small skips add up faster than they feel like they should. Watch the kept number, not the clock." *(reward / make it satisfying)*
- **SK-5:** "The habit needed a cue, a routine, and a reward. You just interrupted the routine." *(habit loop)*
- **SK-6:** "Nothing dramatic happened, and that's the point. Boring skips are what breaking a habit actually looks like." *(make it easy)*

### Milestone (chapter crossings, once each)
- **MS-10** (enters Rhythm): "Ten skips in. You're finding your rhythm, and this only ever counts up. Slips never subtract from here."
- **MS-30** (enters Cruising): "Thirty skips. You're cruising, and the habit is losing its grip. You're becoming someone who decides where money goes."
- **MS-50** (enters Rewiring): "Fifty skips. You're almost rewired. What used to be a decision is starting to be automatic."
- **MS-66** (enters Rewired): "Sixty-six skips. That's the number it takes to rewire a habit. This one doesn't run you anymore."

### Broken streak / slip
- **BR-1** (slip after a run of 3+): "Missing once is an accident. Missing twice starts a new habit, so tomorrow matters more than today did." *(recovery)*
- **BR-2:** "Your kept money is still yours. A slip records what happened; it never takes anything back." *(loss-aversion defuse)*
- **BR-3:** "One slip is a data point, not a verdict. The path you've worn is still there tomorrow." *(identity / continuity)*
- **BR-4:** "Bought it? Noted, no judgment. Making it easy to be honest is how the numbers stay true." *(honesty / make it easy)*

That is 1 + 1 + 7 + 4 + 4 = **17 cards** across the 5 triggers, with room to grow the Skip and Broken-streak pools. If a round number is wanted, three optional Skip additions (SK-7..SK-9) are drafted in section 7; adopting them brings the set to 20.

## 5. Behavior rules

- **Once per event:** a `shownEvents` set keyed by `{trigger, contextId}` prevents a card re-appearing when the user re-opens an already-answered card the same day. Skip-pool rotation persists so the user does not see SK-1 twice before seeing SK-6.
- **Priority when stacked:** milestone beats everything (a chapter crossing is the moment); a run-breaking slip beats a plain slip; first-time cards beat rotation.
- **Never blocks:** the card is below the confirmation and above Change-answer; the primary action for the day is already complete when it shows.
- **Weekly/monthly cadence:** the same triggers apply on skip events; there is no daily-only card. Milestone cards fire on total skip events regardless of cadence.
- **Analytics:** `coach_moment_shown {trigger, cardId}` per render. No content in the event.

## 6. Component states (for build)

| State | Visual | Motion |
|---|---|---|
| Entering | idle card, opacity 0→1, translateY 7px→0 | 220ms ease-out; none under reduced-motion |
| Idle | `#F8F8F8` card, leaf glyph, 14pt `#616161` | none |
| Milestone | `#B2DFB6` 30% tint + bold headline "{total} skips · {chapter}" | same enter motion |
| Dismissed | absent | removed on next mount |

## 7. Optional Skip additions (to reach 20, if wanted)

- **SK-7:** "Make the next one obvious to yourself: put the thing you skipped out of easy reach." *(make it obvious)*
- **SK-8:** "Two minutes of friction beats the purchase. That pause you took is the whole skill." *(2-minute rule)*
- **SK-9:** "Bundle it: pair the skip with something you like, and your brain stops fighting it." *(make it attractive)*

## 8. Acceptance criteria

1. A Coach Moment renders inside the check-in confirmation slot, never as a toast or modal, and never covers the primary action.
2. Each card copy shows once per triggering event; re-opening an answered card does not re-fire it.
3. Slip-trigger cards contain no scolding, no red, and always state the kept money stays.
4. Milestone cards fire exactly once at each chapter crossing (10/30/50/66 total skips) with the tinted treatment + headline.
5. Priority resolves correctly when triggers stack (milestone > run-break > first-time > rotation).
6. Every render fires `coach_moment_shown {trigger, cardId}` with no content properties.
7. The lessons library (`MICRO_LESSONS`, the "Learning" section) is removed; no dead entry point remains.
8. All copy is sentence case, one to two sentences, product vocabulary, no em dashes.

## 9. Decided vs open

**Decided here:** the quiet-card treatment and its states; the five-trigger matrix with selection and priority rules; the 17-card copy set (with 3 optional additions to reach 20); the milestone cards mapped to the v2 chapters; the once-per-event and analytics rules; the lessons-library removal.

**Open, routed to `07-decisions-needed.md`:** whether to ship 17 or the round 20 (adopt SK-7..SK-9). Recommendation: ship 17, add the three in a fast follow after reading beta `coach_moment_shown` rotation data. Not blocking.
