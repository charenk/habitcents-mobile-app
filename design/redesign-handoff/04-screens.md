# 04 · Screens

All layouts are clickable in `App Prototype.dc.html`; static annotated versions in `App Workflow Canvas.dc.html` (R-numbers below).

## Today (R4/R5/R11/R12/R13) — `app/(tabs)/index.tsx`
Order top→bottom, snow bg, 20px side padding, 12 gap:
1. Header: eyebrow date ("THURSDAY, JULY 24") + serif 34 "Today." + gear button right.
2. **Kept band**: sage-light card radius 20, centered: eyebrow "KEPT SO FAR" (sage-dark) · serif 40–44 tabular `$37.50` · caption "money you didn't spend" (zero state: "your first skip starts this counter").
3. **Check-in card** (white, radius 20): habit name 16/600 + chevron (→ habit detail) · week dots row (26px circles: skip = sage + white check, slip = cloud fill, today unanswered = white + 1.5 sage border, future = white + 1.5 cloud border; M T W T F S S labels 9/700 mist) · summary "**4 of 5 days** skipped this week · $26.00 kept" · question "Did you skip it today?" · buttons: sage "Skipped it · keeps $6.50" (flex 1.6) + white "Bought it" (flex 1).
   - Answered-skip state: 40px sage circle-check + "+$6.50 kept." / "That's 4 of 5 days this week." + sage-light coach slot (sprout icon) + "Change answer" link. Skip fires the one allowed pulse + toast.
   - Answered-slip state: 40px cloud circle-minus + "Logged." / "Still 3 of 5 days this week. Your kept stays yours." + snow coach slot + links "Change answer" · "Spent less than usual?" (→ partial-slip sheet).
   - Milestone crossing: chapter pill `10 total skips · Rhythm` (lavender 14% bg) + lavender-tinted coach slot. No confetti.
   - Backfill card (once, until answered): "Missed yesterday? Answer for it:" + Skipped it / Bought it.
   - Pre-detection (no habit yet): "Spotting your leak" card with real progress bar "2 of 4 logs at the same place".
   - Stopped habit: leak card with "Break it again" → pick-one.
   - Weekly habit (2nd): name + lavender "weekly" pill + "No daily check-in. Tap whenever you skip an order." + sage "I skipped one · keeps $22.00".
3. **Quick log card**: eyebrow "QUICK LOG" + sage-dark "amount first" · AmountDisplay (inactive) + 44px sage plus button → log sheet · row of 40px emoji tiles (5 categories + dashed "…" more).
4. **Logged today** list: eyebrow + white card of rows (EmojiTile 36 · name 15/600 + time 12 mist · −$X.XX tabular right). Row tap → edit sheet.

## Log / Edit sheets (R6/R23)
AmountDisplay (serif 46–52) · emoji tile picker (selected = 1.5px category-color border) · keypad · primary "Save expense"/"Save changes". Edit adds coral bare "Delete expense" → deletes + toast "Deleted." with **Undo** (restores at same index, toast "Restored."). Empty amount → toast "Enter an amount first."

## Money (R7/R22) — `app/(tabs)/money.tsx`
Serif "Money." · segmented pill control (cloud track, white raised thumb): **Spent | Upcoming**.
- Spent: day groups with eyebrow "TODAY · $20.70" etc., row cards as above, hint "Tap a row to edit or delete it."
- Upcoming: centered total card (eyebrow "NEXT 60 DAYS" + serif 36 total + "N scheduled") · **dashed add affordance** "＋ Add an upcoming expense" (1.5 dashed #D6DEE8, sage-dark text) · "SCHEDULED" list (EmojiTile + name [+ amber pill e.g. "3 payments in Aug"] + schedule line e.g. "Monthly · 1st · next Aug 1" + amount + cadence).

### Add-upcoming sheet (NEW)
Serif "Add upcoming." · AmountDisplay + keypad · "WHAT IS IT?" name chips (Rent 🏠 lavender, Internet 📡 cyan, Phone 📱 cyan, Gym 🏋️ amber, Insurance 🛡️ blue, Utilities 💡 orange) · "SCHEDULE" two segments **One-time | Repeats**:
- One-time → "When?" chips: Tomorrow / Next week / date options (production: date picker).
- Repeats → frequency chips **Weekly / Bi-weekly / Monthly / Custom**:
  - Weekly → "On which day?" 7 day chips.
  - Bi-weekly → day chips + "Starting" This week / Next week.
  - Monthly → "On the" 1st / 15th / 30th / Last day.
  - Custom → stepper "Every N days" (− / +, clamp 2–90).
- Selected chip = sage bg white text; unselected = white/cloud/slate. Save → "Add to upcoming" → item appears with readable schedule line, 60-day total recomputes, toast "Added to upcoming."
- Data model: extend recurrence to `{type:'once'|'weekly'|'biweekly'|'monthly'|'custom', weekday?, biweekAnchor?, monthDay:'1'|'15'|'30'|'last', everyNDays?}`; keep existing weekly/monthly values migrating cleanly.

## Insights (R8) — `app/(tabs)/insights.tsx`
Serif "Insights." then, in order:
1. **Your leaks** card: rows = EmojiTile + name + "$86 a month · 14 buys" + right action: sage "Break it" (→ pick-one) or sage-light "Breaking" chip (→ habit detail) or "Watch".
2. **Where it went**: rows label (emoji + name) + tabular amount + 6px mist-on-snow bar (widths relative to max). Range label right.
3. **July pace**: serif projected amount + "projected · 7 days left" + 8px sage progress bar + "$1,282 spent / $80 under June". Honest placeholder until one full month of data.

## Habit detail (R9) — `app/habit/[id].tsx`
Back arrow · serif "Morning coffee." + "Starbucks, about 14 times a month." · 3 stat tiles (kept = sage-light, serif numbers; this week; total skips) · **Long arc card**: title + lavender pill "23 of 66 · Rhythm" · serif italic chapter line "You're finding your rhythm." · caption "…Slips never subtract." · lavender segmented progress (10/20/20/16 weights) + chapter labels · calendar/week dots card (sage = skipped, cloud = slipped, outline = no log, legend) · secondary "Edit one skip keeps ($6.50)" → skip-value sheet (AmountDisplay + keypad + Save, toast "Saved. One skip keeps $X.") · tertiary "Stop breaking this habit" → confirm sheet (serif title, "Your history is kept. You can start breaking it again any time.", coral "Stop breaking it" / "Keep going"; toast "Stopped. Your history is kept.").

## Pick-one sheet (R14)
Serif habit name + "a daily leak" · fact lines · "ONE SKIP KEEPS" AmountDisplay (editable) · free-gate row when 2nd habit on free plan: snow card "1 habit on the free plan" + sage-dark "Start a free trial" (→ paywall); primary disabled (cloud bg). Otherwise sage "Start breaking it" · tertiary "Not this one". Nothing is created until the primary tap.

## Paywall (R10) — `app/paywall.tsx`
Gradient hero card (lavender→sage, the only gradient): eyebrow PREMIUM + serif "Break more than one habit" + sub. Check rows (sage-dark checks). Plan cards Yearly (Best value pill, selected = sage-light + 1.5 sage border) / Monthly / Lifetime. Planned-pricing note. Footer: trial line + sage "Start free trial" + "Stay on free plan" (never "No thanks"). Trial start → toast "Trial started. 14 days free." and return to the gated sheet unblocked.
