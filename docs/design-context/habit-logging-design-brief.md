# Habit logging: product design brief (Decision 1)

- **Date:** 2026-07-03
- **Author:** Fable 5 (from code investigation + first prototype round)
- **Purpose:** the kickoff document for a Claude design session. It defines the problem, the fixed mental model, the constraints, and the success criteria. The design session owns the flows, screens, states, motion, and copy. Its output becomes the canonical spec `docs/habit-logging-spec.md`, the same way `docs/leak-scan-spec.md` was produced.
- **Companions:** `habitcents-goals-v2.md` (North Star), `leak-scan-spec.md` (references this feature's confirmation sheet in section 5.4), `phase-2-next-steps.md` (where this fits).

---

## 1. Problem

HabitCents is a break-a-habit money app. Its core promise: find the spending habit leaking money, help the user skip it, and count the dollars kept. The money math already works. The daily logging experience contradicts it.

**User-reported (founder, first on-device test):** "When I discover a habit and want to give my input, it is not clear how I am logging and what I am logging into. The default CTA appears like giving feedback that I did it today. Skipping should be the positive outcome."

**Code-level evidence of the inversion (verified):**
1. The Habits tab button says **"Log Today"** with a **plus icon**. In this app "log" already means "record an expense", so on a coffee-leak card it reads as "I bought coffee, add it". It actually records a skip.
2. The Habits tab has **no way to record a slip at all**: the tap is hardcoded as success. Users who bought the coffee have nothing honest to press.
3. The detail screen's primary is **"Log Today as Success"**. Success is never defined. The only break-a-habit language, "I slipped today", is buried as gray tertiary text.
4. Tapping **"Track"** on a detected habit **silently creates a goal** at an auto-chosen target. The user never learns what one skip is worth. This is the "what am I logging into?" confusion.
5. The streak calendar renders a **logged slip and an unlogged day identically**, so honesty is invisible.
6. Vocabulary drift: "Track", "Active Changes", "Completed/Missed" are neutral tracking words. The product's own vocabulary (leak, skip, kept) appears only in the hero caption.

**Why this matters:** this is the core loop's comprehension risk. If the daily action is ambiguous, every downstream number (streaks, dollars kept, the shareable counter that is the growth artifact) loses meaning and trust.

## 2. Goal

Design the habit-breaking experience so that a first-time user, with zero explanation, understands within one glance:
1. **What** a tracked habit is (a leak they chose to break),
2. **What the daily action is** (answering whether they skipped it),
3. **Which answer is the win** (the skip), and
4. **What the win does** (adds real dollars to Kept, visibly).

And so that recording the loss (a slip) feels safe enough that users actually do it, keeping the numbers honest.

### Non-goals
- Do not redesign expense logging, detection math, reports, or onboarding (separate briefs).
- Do not add gamification systems (points, badges beyond existing milestones, streak freezes). The plan explicitly rejects streak freezes; the recovery coach message is the forgiveness mechanism.
- Do not introduce accounts, sync, or notifications (v1.x).
- Do not reopen settled decisions (section 4).

## 3. Outcome and success criteria

**Product outcome:** a user who skipped today's coffee opens the app, answers in under 5 seconds, sees the kept total grow, and feels the win. A user who bought it can say so in the same place without shame, sees their kept total unchanged, and knows tomorrow is a fresh start.

**Measurable (ties to North Star instrumentation):**
- The daily answer moment is one decision, max two taps, under 5 seconds.
- Skip AND slip are both recordable from the Habits tab (today neither direction is honest there).
- In the eventual beta: slip logs exist in meaningful volume (a proxy for honesty; if slips are ~0% users are abandoning instead of confessing), and logs/user/week stays at or above 4.
- Comprehension test at prototype stage: someone unfamiliar with the app, shown the card, can say what the two buttons mean and which one is "good". If they hesitate, the design fails.

**Deliverable outcome (what the design session hands back):**
1. Flows: detect a leak → decide to break it → daily answering → milestone → slip and recovery. Include the weekly/monthly cadence variant.
2. Screen states for every surface in section 6, every state in section 8.
3. Interactive HTML prototype(s) of the winning direction (light mode, iPhone frame).
4. The full copy set (every label, question, confirmation, empty state; rules in section 7).
5. A final `habit-logging-spec.md` with component specs and acceptance criteria, at the quality bar of `leak-scan-spec.md`, ending with an explicit decided-vs-still-open list.

## 4. The fixed mental model (non-negotiable; design within this)

- **Vocabulary everywhere:** a **leak** is what detection finds. A **skip** is the coached positive action (did not spend). **Kept** is the running total of money not spent. A **slip** is buying it anyway.
- **The skip is the win.** The primary, celebrated action adds the skip value to Kept and extends the skip streak.
- **A slip never subtracts from Kept.** It resets the current streak (longest streak is preserved) and the copy must say the kept money stays theirs. Loss-aversion anxiety is the main reason people stop logging losses; the design must actively defuse it.
- **Breaking a habit starts with an explicit confirmation** (the "pick-one sheet" referenced by leak-scan-spec.md section 5.4): it shows the detection evidence and an **editable "one skip keeps $X" value**, prefilled from the user's own average. No silent goal creation, ever.
- **Three honest day-states**, visually distinct everywhere they appear: skipped (win), slipped (recorded loss), no log (unknown). A recorded slip must never look like an unlogged day.
- **Cadence matters.** Daily leaks get a daily answer moment. Weekly/monthly leaks get an event-based action ("I skipped one") with streaks counted as consecutive skips, not calendar days; no daily nag for a weekly habit.
- **Milestones count "skips in a row"** (1/3/7/14/30/66), never "days" in the abstract.
- **No aggregate cross-habit streak.** Streaks are per habit. The only cross-habit number is Kept (the hero, and the future shareable artifact).
- **Coach Moments mount here:** the confirmation area after an answer is the slot where a contextual one-line coach card appears (skip = reinforcement with dollar framing; slip = recovery: "Missing once is an accident. Missing twice starts a new habit."). Design the slot; the ~20 card copies are a separate task.
- Same-day answers are changeable (an affordance to correct today's answer must exist).

## 5. Prior exploration (input, not mandate; feel free to beat it)

Three directions were prototyped or specced in round 1:
- **A. Daily check-in question (round-1 recommendation).** The control is a question, "Did you skip it today?", with a filled primary "Skipped it +$6.00" and an always-visible plain secondary "I bought it". Clearest possible direction of positivity; most native and restrained.
- **B. Big skip moment.** One large celebratory skip button with a count-up into the Kept hero; slip as a small footer link. Strongest emotion and screenshot energy, but burying the slip risks dishonest streaks and quietly corrupts Kept's credibility.
- **C. Kept ledger / receipt.** Every answer writes a visible line ("Jul 3 · Skipped · +$6.00" / "Jul 2 · Slipped · $0"). Most honest treatment of slips; brand continuity with the website's receipt motif; but heavier, less native, and re-introduces "log a line" framing.

Round-1 synthesis: **A as the model, borrowing C's honesty for the calendar/history** (slips visible as their own state), and B's count-up folded into A as motion. The design session may confirm, remix, or propose something better, provided section 4 holds.

Copy that tested well in round 1 (keep, adapt, or improve):
- Question: "Did you skip it today?"
- Skip confirm: "+$6.00 kept. That's 4 skips in a row."
- Slip confirm: "Logged. Your $42.50 kept stays yours. Fresh start tomorrow."
- First run: "Your first skip starts the counter."
- Pick-one sheet: "Coffee Run costs you about $107 a month. Each time you skip it, we count the money as kept." / field label "One skip keeps" / primary "Start breaking it".
- Detection card actions: "Break it" / "Not this one".
- Section names: "Leaks found", "Breaking now". Hero: "Kept so far", caption "money you didn't spend".

## 6. Surfaces to design

1. **Habits tab.** Kept hero (the one aggregate), the per-habit answer card(s), the detected-leaks list, empty state. Multiple habits (premium allows up to 5) must stack sanely.
2. **Pick-one confirmation sheet.** Detection evidence, editable skip value, cadence-aware framing, start/cancel. (The Leak Scan's "Track this leak" CTA opens this same sheet; it must work for both entry points.)
3. **Habit detail screen.** The same answer control (never a different mental model than the tab), skip streak, kept-so-far progress, milestones, the 3-state history calendar, and slip capture with an optional "how much did it cost?" step (a partial-skip amount already exists in the data model).
4. **The history calendar.** Three states + out-of-range days; weekly/monthly variant shows skip events, not day grids, or an equivalent honest form the design finds better.
5. **The Coach Moment slot** within the answer confirmation.
6. **Weekly/monthly card variant.** "Each skip keeps $18.00" framing with "I skipped one" as the action.

## 7. Constraints

- **Platform and taste:** iOS-native restraint (Apple-Design-Award calibration: restrained beats flashy), light mode only, 44pt touch targets, one primary action per screen, motion 150-250ms and purposeful. Haptics welcome at the skip moment.
- **Tokens (current light theme, evolve deliberately or match):** background #F8F8F8, card #FFFFFF, text #212121 / #757575 / #9E9E9E, border #E5E7EB, primary green #4CAF50 (green = brand/positive ONLY; never use green for anything but the win), muted green #B2DFB6, danger #DC2626 (use sparingly; a slip is honest, not an error), amber accents #FFB74D on #FFF3E0.
- **Copy rules:** no em dashes anywhere, sentence case, plain confident sentences, money framed honestly (tilde or "about" for estimates). Currency is user-configurable including zero-decimal (JPY): design must not assume "$" or two decimals; treat amounts as formatted tokens.
- **Honesty is a design principle:** never hide the slip path, never fabricate continuity, never show a recorded slip as a blank day.
- **Accessibility floor:** every control labeled, swipe actions have button fallbacks, the loop must be completable with VoiceOver.
- **Analytics:** each surface declares its events. Existing: habit_goal_created, habit_tracking_started, skip_logged, milestone_reached. The design should assume skip_logged fires only for skips and a separate slip_logged exists (structural properties only, no amounts or merchant names).

## 8. Edge cases and states the design must cover

- Already answered today (and changing today's answer, including skip-to-slip which must visibly correct Kept and streak).
- Missed yesterday: a one-time, low-pressure backfill for yesterday only; older gaps stay gaps.
- A gap longer than one day (streak restarts; no punishment theater).
- Multiple tracked habits: per-card independence, no aggregate streak, sensible stacking.
- Weekly/monthly cadence, including "skipped one" multiple times in a week.
- First run: no goals yet, first detection just appeared, first answer ever.
- Partial slip: bought it but spent less than usual (optional amount entry; kept credit for the difference exists in the model).
- The slip emotional moment: reset without shame, recovery coach line, tomorrow framing.
- Empty Habits tab (no leaks found yet) pointing back to logging expenses.

## 9. Anti-goals (reject on sight)

- Any labeling where the positive action reads as "I did the habit".
- A hidden or hard-to-find slip path.
- Streak freezes, grace tokens, or fake continuity.
- Shame framing, red-alarm slip states, or guilt copy.
- A second, different logging model between tab and detail screen.
- Generic-AI visual tropes (gradient blobs, glassmorphism, confetti bursts) inconsistent with native restraint.

## 10. How to run the session (suggested)

1. Read this brief fully; restate the mental model in your own words before designing (if the restatement is off, stop and fix understanding first).
2. Explore flows first (detect → break → daily answer → milestone → slip → recover), then screens, then states, then copy.
3. Produce 2 candidate treatments max for the answer moment, compare against section 3's comprehension test, pick one, then go deep on states and edge cases rather than wide on alternatives.
4. End by writing `habit-logging-spec.md` (leak-scan-spec.md is the quality bar): principles, component specs with exact copy, states, edge cases, analytics, acceptance criteria, and a decided-vs-still-open list.
