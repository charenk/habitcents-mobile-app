# 03 · Intent-first onboarding (implement the 3a variant)

Goal: state all three value props up front, let the user self-select a path, converge everyone on Today. The picked card is the acquisition metric.

## Flow
```
welcome → intent picker → ┬ track  → guided-log → success → Today
                          ├ scan   → leak-scan (intake → questions? → results) → Today
                          └ break  → audit-subs → audit-vices → reveal → guided-log → success → Today
skip (on intent screen) → Today
```

## Screen 1 — Welcome (rewrite `app/onboarding/welcome.tsx`)
- Brand row: 34px sage circle + lucide `sprout` white + "HabitCents" 17/700.
- Headline (serif 44, line-height 1.08, ink): **"Your money has a story. Let's read it."**
- Three value-prop rows (32px sage-light tile radius 9, sage-dark lucide icon 16, 15px ink text, 12 gap):
  - `timer` "Log expenses in 10 seconds."
  - `pie-chart` "See where your money goes."
  - `sprout` "Break the habit that costs you most."
- Privacy line (13 mist): "Everything stays on your phone. No bank login. No account."
- Primary CTA: **"Get started"** → intent picker. Tertiary: "How it works" → sheet (3 icon rows: "Log expenses in 10 seconds." / "We spot the habit that leaks the most." / "Every time you skip it, we count the money you kept." + OK button).

## Screen 2 — Intent picker (NEW, replaces `app/onboarding/fork.tsx`)
- Serif title 30: **"What brings you here?"** Sub (14 slate): "Pick one. You can do all three later."
- Three cards (white, cloud border, radius 20, padding 16×18, 12 gap; layout: 40px sage-light icon tile + text column + chevron-right):
  1. eyebrow "10 SECONDS TO START" · title "Just track my spending" · desc "Amount first, one tap per expense. Patterns show up on their own." → guided-log
  2. eyebrow "2 TO 3 MINUTES" · title "See where it all goes" · desc "Scan a bank statement on your phone. Nothing uploads, ever." → leak-scan
  3. eyebrow "ABOUT A MINUTE" · title "Break an expensive habit" · desc "A 90-second audit finds the leak quietly costing you the most." → audit-subs
- Bottom tertiary: "Skip for now" → Today.
- **Analytics (the point of this redesign):** fire `onboarding_intent_selected {intent:'track'|'scan'|'break'}` on card tap; `onboarding_intent_skipped` on skip. Also track `time_to_first_log` and D1 retention per intent cohort.

## Path A — track
Straight to `guided-log.tsx` (restyled): sage-light coach banner "One practice log and you're done. Try today's coffee. Amount first." · serif AmountDisplay (prefill 6.50) · 4–5 emoji category tiles (Food selected) · keypad · primary "Save expense ✓" · tertiary "Later". Save → real expense + toast "Logged. Nice, that took ten seconds." → success.

## Path B — scan
Existing `leak-scan.tsx` logic, restyled (see canvas R16/R26/R27):
- Intake: serif "Scan your statement." · "CSV files only. Everything stays on this device." · file chips (file-text icon) · "Start scan" · "Back".
- Scanning: sage spinner + "Reading your files" + "On this device. Usually a few seconds."
- Questions (max 2, unchanged logic): plain cards with chip pairs.
- Results: eyebrow date range · serif "Your statements, read." · 3 KPI cards (serif numbers) · "Where it went" mist bars · "Your leaks, ranked" (EmojiTile + name + tier pill + "≈ $X/yr pace"; top leak gets sage "Break it" → pick-one sheet; others "Watch") · footer rows-read line + coral "Undo import" · primary "Continue to the app" → Today + toast "Saved to HabitCents."
- Graceful failure: unchanged copy ("This one's on us…"), restyled: sprout in sage-light circle, three exits (Try a different export / Start with the 90-second Leak Audit / Log your first expense by hand). No red, no error icon.

## Path C — break
Existing audit flow restyled (canvas R2/R19/R3): step eyebrows in sage-dark; chips = white/cloud → sage-light/sage border when selected with check icon top-right; dotted-underline editable prices; footer shows serif running total ("≈ $37 a month so far" / "+ $57 a week"); reveal = serif 64 "~$3,120" + breakdown card + honesty line; CTAs "Plug the biggest leak" (→ pick-one → guided-log) / "Just start logging" (→ Today).

## Success (all paths that log)
Serif "Your leak map is ready." · kept band primed $0.00 "your first skip starts this counter" · biggest-leak card with "Break it" · quiet premium line + "See what Premium adds" · "Continue" → Today.

## Keep
- Skip paths always work; no dead ends. Both-empty audit → "We'll find your leak from your real logs." variant (no fake number, no `leak_revealed` event).
