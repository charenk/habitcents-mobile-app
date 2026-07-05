# Habit logging specification (Decision 1)

- **Date:** 2026-07-03. **Revised 2026-07-04** to the accepted v2 synthesis (week rhythm + identity chapters; see changelog, section 9)
- **Status:** accepted direction, spec updated for build
- **Supersedes:** the current Habits tab and habit detail logging surfaces
- **Companion prototypes:** `prototypes/Habit Logging Prototype.html` (v1) and `prototypes/Habit Logging Prototype v2.html` (the accepted direction; canonical where they differ)
- **Sources:** `habit-logging-design-brief.md`, `leak-scan-spec.md` section 5.4 (the Track CTA lands on this spec's pick-one sheet), `habitcents-goals-v2.md`

---

## 0. Mental model restatement

A leak is a spending habit detection found. The user chooses to break it through an explicit confirmation sheet that shows the evidence and lets them edit what one skip is worth. From then on the daily action is answering one question: did you skip it today? The skip is the win: it adds the skip value to Kept and fills a dot in this week's strip. A slip is buying it anyway: it is recorded as its own visible state, costs exactly one dot in the week, and never subtracts from Kept. Long-term progress is total skips accumulated toward the ~66 it takes to rewire a habit, told in chapters that never move backward. Weekly and monthly leaks get an event-based "I skipped one" action instead of a daily question. Kept is the only cross-habit number.

## 1. Principles

1. **The question is the interface.** The card asks "Did you skip it today?" and offers exactly two answers. No "log", no "track", no "success" anywhere in the daily loop.
2. **Both answers are always visible and both are honest.** The slip button never hides, shrinks below tap size, or moves. Recording a slip must cost the same effort as recording a skip: one tap.
3. **The win is felt in dollars.** A skip visibly moves the Kept number (count-up with a green pulse, 200 to 250ms). The connection between the tap and the money is the product.
4. **A slip is cheap, not catastrophic.** A slip costs one dot in the week strip and nothing else. There is no streak to lose, so there is nothing for loss aversion to protect. Copy always states the kept money stays. Color for a slip is neutral, never red.
5. **Progress only accumulates.** The long-term number is total skips, which slips never reduce. Chapters (section 4.6) never move backward. This is the anti fragile replacement for streaks: honesty gets cheaper, not more expensive, the longer you use the app.
6. **One model everywhere.** The answer card on the Habits tab and the habit detail screen are the same component. The three day-states are the same in the week strip, the calendar, and history rows.

### Direction history
Round 1 synthesized model A (daily check-in question) + C's ledger honesty + B's count-up motion. Round 2 explored three refinements (E1 week rhythm, E2 identity arc, E3 kept-hero moment) and the accepted v2 is their synthesis: **E1 replaces streaks with a week strip** on the card, **E2 adds the identity arc and chapters** on the detail screen, **E3 makes the Kept hero pulse** at the skip moment. This amends the brief's "milestones count skips in a row" rule: milestones now fire on total skips (10/30/50/66). Accepted by Charen; recorded here, not reopened.

## 2. Vocabulary and the three day-states

| Term | Meaning | Never call it |
|---|---|---|
| Leak | what detection finds | habit (in detection context), insight |
| Skip | did not spend; the win | success, completed, log |
| Slip | bought it anyway | missed, failed, broke |
| Kept | running total of money not spent | saved, savings goal |
| Chapter | the stage of the 66-skip arc | level, badge, streak |

Day-states, visually distinct in every strip, calendar, and history row:

| State | Meaning | Calendar (26px) | Week strip (24px) |
|---|---|---|---|
| Skipped | answered yes | solid #4CAF50 circle, white check | same |
| Slipped | answered no | solid #757575 circle | #ECEFF1 fill, #78909C dot (lighter at small size so a slip reads recorded, not alarming) |
| No log | no answer that day | 1.5px #E5E7EB outline circle | 1.5px dashed #E5E7EB circle |
| Today, unanswered | today only | outline as no log | 1.5px solid #4CAF50 outline |
| Out of range | before tracking or future | blank cell | dashed empty (future) |

A recorded slip must never render like a no-log day. Checked in acceptance test 7. Direction prototypes (06) may retint these tokens; the state system holds.

## 3. Flows

### 3.1 Detect a leak, decide to break it
1. Detection produces a leak card in the **Leaks found** section of the Habits tab (or a Leak Scan habit card, same destination).
2. Card actions: **Break it** (primary) and **Not this one** (dismiss with suppression).
3. Break it opens the **pick-one sheet** (section 4.3). Nothing is created until the user taps Start breaking it.
4. On start: the habit moves to **Breaking now**, `habit_goal_created` and `habit_tracking_started` fire, and the card shows its first-run state: "Your first skip starts the counter."

### 3.2 Daily answering (daily cadence)
1. User opens the Habits tab. Each breaking-now card shows the week strip (Mon to Sun) and asks "Did you skip it today?"
2. Tap **Skipped it +{skipValue}**: the Kept hero counts up and pulses green (4.1), today's dot fills green, the card confirms "+{skipValue} kept. That's {n} of {m} days this week.", a Coach Moment may mount, `skip_logged` fires. Haptic: success.
3. Tap **I bought it**: today's dot fills neutral, the card confirms "Logged. Still {n} of {m} days this week. Your {keptTotal} kept stays yours.", the recovery Coach Moment may mount, `slip_logged` fires. No haptic beyond selection. An optional link "Spent less than usual?" opens the partial-slip step (4.7).
4. Answered card shows today's state plus **Change answer** (today only).

### 3.3 Event answering (weekly and monthly cadence)
1. The card frames value per event: "Each skip keeps {skipValue}." Primary button: **I skipped one**. Secondary: **I bought it**.
2. Multiple skips per period are allowed; each fires `skip_logged` and adds to Kept. A period chip shows "{n} skips this week".
3. No daily question and no daily nag. Long-term progress is total skip events, feeding the same chapter arc.

### 3.4 Chapter milestone
Milestones fire on **total skips** crossing 10, 30, 50, 66. The confirmation slot swaps to the milestone treatment (4.5) for that render, `milestone_reached` fires once per threshold per habit, and the arc on the detail screen advances a chapter. No modal, no confetti.

### 3.5 Slip and recovery
A slip fills one neutral dot and reduces this week's ratio by one. Total skips, Kept, and the chapter are untouched. The next day's card carries no residue: same question, same two buttons. When a slip follows 3 or more consecutive skips, the recovery Coach Moment is prioritized: "Missing once is an accident. Missing twice starts a new habit."

### 3.6 Missed yesterday (backfill)
If yesterday has no log and the user answers today, the confirmation area appends a one-time line: "Missed yesterday? Answer for it:" with the same two answers inline. Backfill is offered for yesterday only; older gaps stay gaps. Answering fires the normal event with `backfill: true`.

## 4. Component specs

### 4.1 Kept hero (Habits tab)
- Label: **Kept so far** (caps, 12 to 13pt, #757575, letter-spaced). Amount: the one big number, formatted by `useCurrency().format`, 40pt+, #212121. Caption: "money you didn't spend".
- **The moment (E3):** on any skip, the amount counts up over 250ms while the number tints #4CAF50 and scales to 1.06, then settles back to #212121 at scale 1 (200ms ease-out). Decreases (corrections) count down with no pulse. Reduced-motion: instant swap, no scale.
- This is the only aggregate. No cross-habit number of any other kind exists.

### 4.2 Check-in card (the answer card)
Anatomy, top to bottom:
1. Header row: habit name (17pt semibold, tappable to detail with a chevron).
2. **Week strip (daily cadence only):** seven 24px dots labeled M T W T F S S, states per section 2, followed by the summary line "**{n} of {m} days** skipped this week · {weekKept} kept" (12pt; bold ratio; hidden until the week has an answer).
3. Question: "Did you skip it today?" (15pt, #212121).
4. Buttons row (both ≥ 44pt, full-width split): primary filled #4CAF50 "Skipped it +{skipValue}"; secondary bordered "I bought it".
5. Answered state replaces rows 3 to 4 with the confirmation (4.4) + Change answer link.

Weekly/monthly variant: no week strip; value line "Each skip keeps {skipValue}." replaces the question; primary reads "I skipped one"; a period chip shows "{n} skips this week" when the period has activity.

First-run state: below the question, one quiet line "Your first skip starts the counter." until the first answer ever.

Stacking: unanswered daily cards first, then weekly/monthly, then answered-today cards. Free tier shows 1 card; premium up to 5.

### 4.3 Pick-one confirmation sheet
Opened by Break it (Habits tab) and Track this leak (Leak Scan results). Native sheet, medium detent.
1. Title: habit name. Subtitle: cadence ("A daily leak" / "A weekly leak").
2. Evidence block, plain sentences from real detection data: "Coffee run costs you about {monthTotal} a month. You bought it {n} times in the last 30 days." Tilde or "about" mandatory on projections.
3. Value line: "Each time you skip it, we count the money as kept."
4. Editable field, label **One skip keeps**, prefilled with the detected per-occurrence average, currency-formatted, numeric keyboard, inline.
5. Cadence note: daily "We'll ask each day: did you skip it?"; weekly/monthly "Tap I skipped one whenever you skip. No daily check-in."
6. Primary filled: **Start breaking it**. Secondary: **Cancel**. Nothing is created on cancel.
- Analytics: `habit_goal_created {cadence, valueEdited}` then `habit_tracking_started`.

### 4.4 Confirmation slot (after an answer)
- Skip: "+{skipValue} kept. That's {n} of {m} days this week." First ever skip: "+{skipValue} kept. Your counter is running." Weekly: "+{skipValue} kept. {n} skips this week."
- Slip: "Logged. Still {n} of {m} days this week. Your {keptTotal} kept stays yours." (keptTotal zero: "Logged. Tomorrow is a fresh start.")
- Below the confirmation line, priority order: milestone treatment (if a chapter threshold was crossed), else Coach Moment (if eligible), else nothing.
- Change answer: plain link, today only. Skip to slip confirms: "Corrected. Today is a slip, so {skipValue} came off your kept total. It was never spent money, just today's answer." Kept counts down without pulse; the week dot flips; total skips decrements by one but the displayed chapter holds (4.6). `answer_changed {from, to}` fires.

### 4.5 Coach Moment slot and milestone treatment
- The slot is a full-width quiet card inside the check-in card, below the confirmation line: #F8F8F8 fill, 12px radius, 14pt text. Not a toast, not a modal, never blocks anything.
- Milestone render: same slot, #B2DFB6 tint at 30%. Headline above the slot: "{n} total skips · {chapter name}". Card line: "A new chapter. Progress here only accumulates, slips never subtract." (final chapter copy owned by `04-p2-2-coach-moments.md`).
- Each card copy renders once per triggering event; `coach_moment_shown {trigger, cardId}` fires per render. No X; the slot disappears on next visit.

### 4.6 The long arc (identity arc, habit detail)
Card titled **The long arc**:
- **Ring:** 84px, conic fill = totalSkips / 66, center "{totalSkips}" over "OF 66".
- **Identity line** (right of ring, by chapter):
  - 0 to 9, Deciding: "You're deciding where your money goes."
  - 10 to 29, Rhythm: "You're finding your rhythm."
  - 30 to 49, Cruising: "You're cruising. The habit is losing its grip."
  - 50 to 65, Rewiring: "You're almost rewired."
  - 66+, Rewired: "Rewired. This habit doesn't run you anymore."
- Support line: "{totalSkips} skips toward the ~66 it takes to rewire a habit. Slips never subtract."
- **Chapter track:** four segments labeled Deciding / Rhythm / Cruising / Rewired filling left to right (thresholds 10 / 30 / 50 / 66).
- **Never backward:** the chapter label reflects the highest total ever reached. A same-day correction can lower the number by one, never the chapter.

### 4.7 Partial slip (spent less than usual)
- Entry: the "Spent less than usual?" link in the slip confirmation or the detail screen's today row.
- Sheet: "How much did it cost?" + amount field + "You usually spend about {skipValue}. Anything under that counts as kept." Save credits `max(0, skipValue − amount)`; the day remains a slip state; confirmation: "Logged. You spent {amount} instead of {skipValue}, so {difference} counts as kept."
- Amount ≥ skipValue: "Logged. Fresh start tomorrow." No negative credit. Partial days do not increment total skips.
- `slip_logged {partial: true}` (structural only).

### 4.8 Habit detail screen
Top to bottom:
1. The same check-in card (4.2), week strip included. Never a different control.
2. Stats row, three equal blocks: **Kept** (this habit) · **This week** ("{n} of {m}"; weekly cadence: "{n} skips") · **Total skips**.
3. **The long arc** (4.6).
4. History calendar (4.9), or event history for weekly/monthly.
5. Footer: "Edit one skip keeps ({skipValue})" (single-field sheet) and "Stop breaking this habit" (confirm dialog; history preserved).

There is no longest-streak stat and no milestone marker row; the arc replaces both.

### 4.9 History calendar
- Daily cadence: month grid with the day-states of section 2, month pager, legend row (Skipped, Slipped, No log). Pre-tracking and future days are blank.
- Weekly/monthly cadence: event list, newest first: "{date} · Skipped one · +{skipValue}" or "{date} · Bought it" (partial: "{date} · Bought it · {difference} kept").
- Tapping today offers the same change-answer affordance as 4.4.

### 4.10 Leak card and empty states
Unchanged from v1: leak card with Break it / Not this one (no swipe-only actions); empty state "No leaks found yet" with body "Keep logging expenses. Around 4 logs at the same place is enough to spot a pattern." and CTA "Log an expense"; Kept hero at zero captions "your first skip starts this counter".

## 5. Edge cases

| Case | Behavior |
|---|---|
| Already answered today | Card shows strip + state + Change answer; question hidden |
| Change skip to slip | Kept counts down (no pulse), week dot flips, total skips −1, chapter holds |
| Missed yesterday | One-time inline backfill for yesterday only (3.6) |
| Gap ≥ 2 days | Dots stay no-log; nothing else changes; no punishment copy |
| Week boundary | Strip resets Monday; week ratio starts fresh; total skips and chapter carry |
| Multiple habits | Independent cards and arcs; one Kept hero |
| Multiple skips, weekly | Each adds; period chip increments; total skip events feed the arc |
| First run | First-run line; first skip uses first-ever confirmation |
| Partial slip | 4.7; day stays slip; difference credited; no skip counted |
| Zero-decimal currency | All amounts through `useCurrency().format` |
| Free tier, 2nd habit | Quiet "1 habit on the free plan" note on the pick-one sheet (07, item 4) |

## 6. Analytics (anonymous, structural only)

| Event | Properties | Fires |
|---|---|---|
| `habit_goal_created` | cadence, valueEdited | pick-one sheet Start |
| `habit_tracking_started` | cadence, source: detection\|scan | same tap |
| `skip_logged` | cadence, totalSkipsAfter, weekSkips, backfill | skip answer |
| `slip_logged` | cadence, partial, backfill | slip answer |
| `answer_changed` | from, to | change-answer |
| `milestone_reached` | milestone: 10\|30\|50\|66 | total-skip crossing, once per threshold |
| `habit_dismissed` | source | Not this one |
| `coach_moment_shown` | trigger, cardId | slot render |

No amounts, merchant names, or habit titles in any event.

## 7. Acceptance criteria

1. Comprehension: a first-time viewer of the check-in card can state what both buttons mean and which is the win, without hesitation.
2. Skip and slip are each recordable in one tap from the Habits tab; both buttons ≥ 44pt.
3. A skip moves the Kept hero with a visible count-up and green pulse in the same viewport.
4. A slip never changes Kept, total skips, or the chapter, and its confirmation states the kept money stays.
5. The pick-one sheet always precedes goal creation; the skip value is editable there; cancel creates nothing.
6. Tab and detail use the identical answer component.
7. A recorded slip is visually distinct from a no-log day at a glance in both the strip and the calendar (distinct fill, not just hue).
8. Weekly leaks never show a daily question, a week strip, or daily empty states.
9. The chapter label never moves backward, including after answer corrections.
10. `milestone_reached` fires exactly once per threshold per habit.
11. Backfill is available for yesterday only, once.
12. VoiceOver: every control labeled; each strip and calendar cell exposes its day-state; the loop (open tab, answer, hear confirmation) completes.

## 8. Decided vs still open

**Decided:** the v2 synthesis (E1 week strip, E2 identity arc + chapters at 10/30/50/66 total skips, E3 hero pulse); no user-facing streaks anywhere; detail stats Kept / This week / Total skips; milestone events on total skips; all copy in section 4; backfill scope; partial slip rules; weekly history as event list.

**Open (routed to `07-decisions-needed.md`):** none blocking. Day-state tokens restate in the P2-4b direction prototypes; if the picked direction retints them, the state system holds.

## 9. Changelog

- **2026-07-04:** updated to the accepted v2 synthesis. Streak chips, "skips in a row" copy, the longest-streak stat, and the 1/3/7/14/30/66 milestone row are removed. Added: week strip + week ratio copy, the long arc with chapters (Deciding / Rhythm / Cruising / Rewiring / Rewired) on total skips 10/30/50/66, Kept hero pulse, revised analytics (`skip_logged.totalSkipsAfter`, `milestone_reached` on total skips).
- **2026-07-03:** initial spec (v1 synthesis).
