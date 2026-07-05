# P2-1 onboarding: two doors and the Door 1 Leak Audit

- **Date:** 2026-07-04
- **Status:** final direction spec (Option A chips + Option B's inline price edit, reframed per review: recognition, not inventory)
- **Companion board:** `prototypes/Onboarding Leak Audit Options.html` (options A/B/C, recommendation, and the Final row this spec documents)
- **Sources:** `habitcents-design-scope-phase2.md` section 5.1, `leak-scan-spec.md` section 7 (Door 2 graceful failure re-enters here), `01-habit-logging-spec.md` (the pick-one sheet and Habits tab the flow lands on)
- **Gates:** leak number on screen in under 90 seconds; audit completion target 60%+; every step instrumented; skippable without dead ends

---

## 1. Principles

1. **Recognition, not inventory.** No step ever asks the user to enter everything they spend. Step 1 asks which auto-pilot charges ring a bell; step 2 asks for a weekly rhythm. About 10 taps end to end, keyboard optional.
2. **The reveal is a hypothesis, not a verdict.** Every projected number carries a tilde or "about" and names its basis ("from one minute of taps"). Real logs sharpen it; the copy says so.
3. **The fast path is never taxed.** Precision is available (tap any price to set your exact amount) but always optional. Ignoring every edit affordance gives the pure tap-only flow.
4. **Each step leaves something behind in the app.** Step 1 seeds recurring expenses the app watches. Step 2 seeds the leak estimate detection will test first. The first log is a real expense. Nothing is throwaway.
5. **Skips are honest exits, not dead ends.** Every step has a plain-button skip that continues the flow; the flow degrades its outputs (section 8) instead of blocking.
6. **Analytics are structural only.** Counts, booleans, step names. Never amounts, merchant names, or typed text.

## 2. Flow map

```
Welcome
  └─ Find my leak → Two-door fork
       ├─ Start fresh (Door 1) → Step 1 auto-pilot charges → Step 2 everyday rhythm → Reveal
       │                                                                                └─ Plug the biggest leak → pick-one sheet → Guided first log → Success
       │                                                                                └─ Just start logging  → Guided first log → Success
       ├─ Bring your statements (Door 2) → Leak Scan (leak-scan-spec.md)
       │      └─ graceful failure → re-enters Step 1, primed (section 8.6)
       └─ Skip for now → app (Expenses tab, zero-expense empty state)
```

Timing budget against the 90-second gate: welcome 5s, fork 5s, step 1 ~30s, step 2 ~20s, reveal 10s. The leak number is on screen at ~70s. First log and success add ~20s beyond the gate, which measures time to the number, not to completion.

## 3. Screens and copy

All amounts below are display examples; every rendered amount goes through `useCurrency().format`. Sentence case throughout. No em dashes.

### 3.1 Welcome
- Wordmark. Headline: **"Find the spending habit quietly costing you $100 a month"** (amount is a formatted token of the localized positioning figure, not math).
- Sub: "Everything stays on your phone. No bank login. No account."
- Primary: **Find my leak**. Plain: **How it works** (opens a 3-line sheet: "Log expenses in 10 seconds. We spot the habit that leaks the most. Every time you skip it, we count the money you kept.").
- One screen. No pager, no feature carousel, no voice-input promises.

### 3.2 Two-door fork
- Title: "How do you want to start?" Sub: "Both stay on this device."
- Door 1 card (visually primary): tag "About a minute", name **Start fresh**, description "Tap through what you pay for. We estimate your leak from your answers."
- Door 2 card: tag "2 to 3 minutes", name **Bring your statements**, description "Import a bank CSV. We scan it on your phone. Nothing uploads, ever."
- Plain: **Skip for now** (section 8.5).

### 3.3 Step 1: auto-pilot charges
- Eyebrow: "Step 1 of 2 · about 30 seconds". Title: **"Which of these charge you on auto-pilot?"**
- Sub: "Tap the ones that ring a bell, we'll watch them for you. A quick scan, not a full inventory. Tap a price to make it exact."
- **Chip grid, 2 columns, 8 chips, regional-neutral (no brand names):**

| Chip | Preset |
|---|---|
| Video streaming | ~$12/mo |
| Music | ~$11/mo |
| Cloud storage | ~$3/mo |
| Gaming | ~$10/mo |
| News | ~$8/mo |
| Fitness | ~$15/mo |
| Dating | ~$20/mo |
| Something else | you set it (name + amount, the only typed chip) |

- Chip states: off (white, gray border); selected (green border, light green fill, price bold green); selected-with-edited-price (tilde dropped, green dotted underline under the price).
- Running total footer: "**{total} a month** so far", re-animating on every change. Total shows a tilde while any counted price is a preset; drops it only when every counted price is user-set.
- Primary: **Continue**. Plain: **None of these** (continues to step 2 with zero subs).

**Inline price editor (the B fold-in):** tapping a chip's price expands that chip to full grid width as an editor: header "{Chip name} · your real price" with a ✕ cancel button, an amount field (numeric keyboard, current value preselected, visible caret), a **Set** commit button, and the caption "Preset was {preset}. Set saves your exact price, ✕ keeps the preset." Set commits, collapses the chip, re-animates the total, and fires `audit_amount_edited`. ✕ or tapping elsewhere cancels with no change. Editing never adds a screen or a required step.

### 3.4 Step 2: everyday rhythm
- Eyebrow: "Step 2 of 2 · about 30 seconds". Title: **"And the everyday stuff?"**
- Sub: "Roughly how often in a typical week. No amounts to add up. Tap a price if yours differs."
- **Three vice rows**, each: name, per-item value ("about $6 each", tap-to-edit with the same editor pattern), and a 4-segment band control: **Never · 1-2 · 3-5 · Daily** (segments ≥ 44pt).

| Vice | Preset per item |
|---|---|
| Coffee or tea out | ~$6 each |
| Food delivery | ~$18 each |
| Impulse buys | ~$15 each |

- No default selection. An unanswered row counts as Never (0) in the math but is distinguishable in analytics (`answered` count).
- Running footer: "adds **{weekly} a week**". Primary: **See my leak**. Plain: **Skip this step**.

### 3.5 The reveal
- The number, huge: **"~{yearly}"**. Caption: "leaking a year. That's about {monthly} a month."
- Breakdown card, top 3 lines by size: "{source} · ~{amount}/yr" (sources: each vice with a non-Never band, plus one combined "Subscriptions" line).
- Honesty line: "A starting estimate from one minute of taps, not a judgment. Real logs sharpen it from here."
- Primary: **Plug the biggest leak** (opens the Decision-1 pick-one sheet prefilled from the largest breakdown line: evidence sentence built from the audit answers, One skip keeps prefilled with that item's per-item value). Plain: **Just start logging**.
- Both CTAs continue to the guided first log; the primary path first completes the pick-one sheet so the user lands with one habit already breaking.

### 3.6 Guided first log
- Coach hint bar: "One practice log and you're done. Try today's coffee. Amount first."
- The real log form (amount-first keypad, category chips), not a simulation. Saving writes a real expense and fires `first_log_saved`.
- Skippable via "Later" plain link (success screen still shows; funnel records the gap).

### 3.7 Success
- Check mark, title "Your leak map is ready".
- Kept hero primed at formatted zero, caption "your first skip starts this counter".
- Biggest-leak card: name + "about {monthTotal} a month · your biggest leak" + **Break it** (opens the pick-one sheet if not already done on 3.5).
- Quiet note: "Premium trial available when you're ready. 1 habit free, always." (trial touchpoint placeholder; paywall is Phase 3.)
- Continue lands on the Habits tab.

## 4. Projection formula

```
yearlyLeak = roundTo10( Σ subscriptions monthlyValue × 12
                      + Σ vices bandMidpoint × perItemValue × 52 )
bandMidpoints: Never = 0 · 1-2 = 1.5 · 3-5 = 4 · Daily = 7
monthly companion = yearlyLeak / 12, rounded to the nearest whole currency unit
```

- Rounding: nearest 10 major units. The tilde is mandatory on the yearly number and every breakdown line. Never show cents on the reveal.
- Values are whatever is on the chips at reveal time: preset or user-edited exact.
- Zero-decimal currencies use the same math on minor-unit-free values via the currency config.

**Worked example 1 (all presets):** subs Video 12 + Music 11 → 23 × 12 = 276. Coffee 3-5: 4 × 6 × 52 = 1,248. Delivery 1-2: 1.5 × 18 × 52 = 1,404. Impulse Never: 0. Total 2,928 → displayed **"~$2,930 a year. That's about $244 a month."**

**Worked example 2 (edited prices):** Video edited to 15.49, Music to 10.99 → 26.48 × 12 = 317.76. Coffee edited to 5.75 at 3-5: 4 × 5.75 × 52 = 1,196. Delivery 1-2: 1,404. Total 2,917.76 → **"~$2,920 a year."**

**Worked example 3 (no subs, coffee daily):** subs 0. Coffee Daily: 7 × 6 × 52 = 2,184 → **"~$2,180 a year."**

## 5. Seeding rules (what the audit leaves behind)

| Input | Writes |
|---|---|
| Selected subscription chip | One recurring expense: category Software & Subscriptions (pending taxonomy answer, 07 item 1), cadence monthly, amount = exact edited value or preset value, `source: 'audit'`, next date one month out. Appears in Upcoming immediately. |
| "Something else" chip | Same, with the user's name and amount. |
| Vice band answers | No recurring expense (variable spend is not a fixed recurrence). Stored as audit baselines `{item, band, perItemValue}`: they power the reveal breakdown, pre-rank detection's first candidates, and prefill the pick-one sheet when the user breaks that leak. |
| Reveal | Nothing by itself. "Plug the biggest leak" creates a habit only through the pick-one sheet, never silently. |
| Guided first log | One real expense. |

Edited prices seed at the exact value; untouched chips seed at the preset. Deleting a seeded recurring expense later is the normal recurring-expense flow, nothing special.

## 6. Analytics funnel (anonymous, structural)

| Event | Properties | Fires |
|---|---|---|
| `onboarding_started` | | welcome appears, once per install |
| `door_chosen` | door: fresh\|statements\|skip | fork tap |
| `audit_subs_done` | selected, edited, none: bool | step 1 Continue or None of these |
| `audit_vices_done` | answered, skipped: bool | step 2 See my leak or Skip |
| `audit_amount_edited` | step: subs\|vices, count | each Set commit |
| `leak_revealed` | nSources, hasEdits | reveal render |
| `first_log_saved` | guided: true | save on 3.6 |
| `onboarding_completed` | door, habitStarted: bool | success Continue |

No amounts, chip names, or typed text in any event. Door 2 events belong to `leak-scan-spec.md` section 8.

## 7. Edge cases

| Case | Behavior |
|---|---|
| **Zero subscriptions** | "None of these" continues to step 2. Reveal computes from vices only; breakdown has no Subscriptions line. |
| **Step 2 skipped** | Reveal computes from subscriptions only; caption gains "from your subscriptions so far". |
| **Both empty** (no subs, all Never or skipped) | No number to show, so no fake number: the reveal is replaced by "We'll find your leak from your real logs. Around 4 logs at the same place is enough to spot a pattern." then the guided first log. `leak_revealed` does not fire. |
| **Only "Something else"** | Normal math on the one typed item. |
| **Mid-flow abandon and reopen** | Step answers persist locally per step. Reopen with onboarding incomplete resumes at the first incomplete step with prior answers intact; welcome is not repeated after `door_chosen`. Seeding happens only at each step's Continue, so abandon never half-writes. |
| **Door 2 graceful failure re-entry** | Leak Scan's failure screen action "Start with the 90-second Leak Audit" opens step 1 with anything the scan confidently found pre-selected as chips at exact values: no tilde, annotated "from your statements". Confirming seeds them like edited chips. Scan-found vices pre-select the nearest band. |
| **Skip for now (fork)** | Lands on Expenses tab with the zero-expense empty state. The Habits empty state carries a quiet "Take the 90-second leak audit" re-entry link. |
| **Re-running the audit** | Re-entry from the Habits link when audit items exist opens step 1 with prior selections shown; re-continuing updates rather than duplicates seeded recurring expenses (match on `source: 'audit'` + chip id). |
| **Currency** | Preset table is defined per supported currency in config (sensible local values), never converted at runtime. All display via `useCurrency().format`. |

## 8. Accessibility

- Chips and band segments ≥ 44pt. Chip VoiceOver label: "{name}, about {preset} a month, {selected/not selected}". Edited chips: "{name}, {exact}, your price, selected".
- The inline editor traps focus: field → Set → cancel; ✕ labeled "Keep the preset price".
- The reveal number is announced as one utterance: "About {yearly} a year leaking, about {monthly} a month".
- Band control is an adjustable group for VoiceOver (swipe up/down changes band).
- Every plain-button skip is in the focus order after the primary.

## 9. Acceptance criteria

1. A first-time user reaches the reveal in under 90 seconds using only taps (no keyboard) with presets.
2. No step asks for an inventory; step titles ask recognition ("ring a bell") and rhythm questions only.
3. Every projected number shows a tilde or "about"; the reveal names its basis and its sharpening path.
4. Ignoring every edit affordance yields the identical flow with zero keyboards shown.
5. Editing any price updates the running total and the reveal math with the exact value; that chip's tilde drops and the dotted underline shows.
6. Selected chips appear in Upcoming as recurring expenses immediately after onboarding; vices never do.
7. "Plug the biggest leak" always routes through the pick-one sheet; nothing is created silently.
8. Both-empty case shows the honest no-number path, never a fabricated figure.
9. Abandon and reopen resumes correctly at each of the five steps.
10. Door 2 failure re-entry shows scan-found items pre-selected with exact values and no tilde.
11. Every event in section 6 fires with structural properties only.
12. VoiceOver completes welcome → reveal → first log → success.

## 10. Decided vs open

**Decided here:** the Final input pattern (chips + bands + optional inline exact-price edit); the expanded-chip editor design; step framing (recognition/rhythm/hypothesis); the formula, midpoints, and rounding; seeding rules including vices-never-seed; the funnel; all edge-case behavior above; success screen contents with the quiet trial note.

**Open, routed to `07-decisions-needed.md`:**
- Category for seeded subscriptions depends on the taxonomy answer (07 item 1).
- The preset price table and the three-vice set are money/taste calls: recommendation is the table in 3.3/3.4, sign-off requested (07 item 5).
- Free-tier note wording on the pick-one sheet follows 07 item 4.
