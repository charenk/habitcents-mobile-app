# Device pass: everything since build 13

The on-device walk for the next TestFlight build, which is the first build a phone has
seen since build 13 (`8f218a8`) on 2026-08-13. That gap is 45 commits and 201 changed
files, so this is no longer only the accessibility pass that ADR 0008 deferred to the
Phase 4 beta. It is also the first real look at onboarding v3.1, the ADR 0027 palette,
and the ADR 0028 save convention. None of that has ever run on a device.

The walk is in two parts.

- **Part 1, the product pass.** Default text size, no VoiceOver. Work that no device has
  ever run, so the question is whether it is right at all.
- **Part 2, the accessibility pass.** Dynamic Type and VoiceOver, as originally scoped.

Do them in that order. Part 1 is quick and covers the higher risk. Part 2 is slow, and
it goes faster on screens you have already seen once.

It exists in this repo because the script it replaces
(`docs/accessibility-test-with-voiceover.md`, referenced by ADR 0008 and
`CLAUDE.md`) lives in the private `charenk/habitcents-ops` repo, which the
mobile repo cannot reach. Keep them in sync if both survive; prefer this one
while the walk is a mobile-repo activity.

## Why this needs a human

Every accessibility claim in the audits is code-level. `design/audit/UXUI_AUDIT.md`
scores Accessibility 4/4 and Responsive design 4/4 and then says, five separate
times, that no on-device screen-reader or Dynamic Type pass has confirmed any
of it. Jest cannot measure layout and cannot hear VoiceOver. The tests in
`__tests__/dynamicType.test.tsx`, `__tests__/renderedA11y.test.tsx` and
`__tests__/a11y.test.ts` pin decisions and label strings; only a device shows
whether a box actually clips or a focus order actually makes sense.

## Before you sit down

**The scan door needs a real CSV.** Three of onboarding v3.1's screens (scope selection,
the habit deck, the bills offer) exist only downstream of a statement import. Without a
file the document picker can reach, they cannot be walked at all. Export a CSV from your
bank and put it in Files or iCloud Drive first. It never leaves the device, and no
network call carries it anywhere.

Budget about an hour. Part 2 is the slow half.

## Setup

Three stages, in this order. The order matters, because stage 1 is observable exactly
once and a wrong tap destroys it.

**Stage 1: install over the existing app.** Never delete first. All data is on-device
only, and the upgrade itself is a test.

- [ ] Before touching anything else, open Money → Upcoming. Does it still project, with
      no duplicates? That closes the recurrence upgrade test owed since build 13, and a
      fresh install destroys the evidence for good.
- [ ] Did the app open on Today rather than dropping you into onboarding?
      `app/onboarding/intent.tsx` exists purely so a persisted `currentStep` from an older
      install cannot route to a screen that no longer exists, which is how build 5
      crashed. Landing anywhere unexpected here is a finding, and a serious one.

**Stage 2: replay onboarding with your data intact.** Profile → dev menu →
"Restart onboarding". It clears the flow state and the has-onboarded flag and sends you
to the carousel, and it leaves expenses, habits and categories alone
(`components/dev/DevMenuSection.tsx:115-124`). This is how you walk part 1 without
losing anything.

**Stage 3: wipe, only for a true cold first run.** Last, or not at all.

### The dev menu

On in this build because the internal profile sets `EXPO_PUBLIC_DEV_MENU: "1"`
(`eas.json`). Profile → scroll to the bottom.

| Row | What it does | Destroys your data? |
|---|---|---|
| Entitlement | Toggles free / premium for the paywall surfaces | No |
| Persona: new user | Zero data | **Yes** |
| Persona: first run | Onboarding, defaults ready | **Yes** |
| Persona: returning user | Rich history | **Yes** |
| Restart onboarding | Onboarding state only | No |
| Wipe | `clearAppData()`, everything goes | **Yes**, behind a confirm |

**Do not tap a persona until stage 1 is done.** `applyPersona` calls `clearAppData()`
before it seeds (`data/devPersonas.ts:172-174`), so a persona is a wipe with a refill.
The rows do not warn you, and the upgrade check above cannot be redone afterwards.

## Part 1: what no device has ever run

Default text size, VoiceOver off. You are judging whether this is right, not whether it
is accessible. Part 2 handles that.

### 1.1 The carousel, the new front door

`app/onboarding/welcome.tsx` replaced both the old welcome splash and the intent picker
with one surface: three beats, each a CTA that starts that workflow for real.

- [ ] Beat 1 "Log it in ten seconds." into "Log my first expense".
- [ ] Beat 2 "See where it all goes." into "Scan my statement".
- [ ] Beat 3 "Break the one that costs most." into "Start with my habit".
- [ ] Does each CTA actually land in the workflow it names?
- [ ] Do the three beats read as one idea, or as three unrelated pitches?
- [ ] The media frames are deliberately empty (see "known and already accepted"). Does
      the screen still hold together with them empty, or does it read as broken?

### 1.2 The scan door, end to end

This is the longest new flow and the one that needs your CSV. From beat 2:

- [ ] Intake, "Scan your statement." Does the picker find your file?
- [ ] Scope, "Where should we look?" Are the locked categories (rent, medical,
      childcare, insurance) shown as judgment rather than omission? The copy claims they
      go to Upcoming, not to habits. Does that land?
- [ ] Confirm with **nothing** selected. The promise is "No habit ideas, just the
      breakdown", so you should still get every dollar and simply no proposals. Does it
      hold, or does it feel like a dead end?
- [ ] Deck, "Start with one." At most three cards, each a decision. Is card 1 actually
      your biggest leak? Are the others plausible?
- [ ] Dismiss every card. The fallback is the full breakdown in one hop, never a
      fallback of a fallback.
- [ ] Payoff, "You have a habit to break." Every figure here is meant to be observed,
      never extrapolated: a count, a total, a per-skip price. Check them against your
      own statement. A number you cannot reproduce is a finding.
- [ ] Bills, "The rest of your money." Do the bills you accept actually appear in
      Money → Upcoming?

### 1.3 The palette (ADR 0027)

Primary green is now `#2C7851`, and ink-on-sage is retired. Every green surface changed.

- [ ] Take the phone outside, or to a bright window. Is white on the new green
      comfortable, or is it harsh?
- [ ] Does any surface still read as the old ink-on-sage, meaning a spot the sweep missed?
- [ ] Green is positive-only in this app. Is it doing anything else anywhere?

### 1.4 The save convention (ADR 0028)

Every sheet converged on disabled-until-valid, and save moved into the sheet header.

Try: log an expense, add an upcoming bill, add a category, the pick-one sheet.

- [ ] Is save visibly disabled until the form is actually valid?
- [ ] Is it reachable in the header without scrolling or dismissing the keyboard?
- [ ] Number pad and letter keyboard both: does the Done bar dismiss, rather than trap you?
- [ ] Does disabled-until-valid ever feel like the app is stuck, with no clue what is
      missing?

### 1.5 Today, the craft round

- [ ] The quick-log trigger: enclosed field, square add button. Obvious what to tap?
- [ ] Switchers across the app share one radius grammar now. Any that look off-family?
- [ ] Tap Skip, then immediately tap again. Does the interrupt behave, or does it double
      fire?
- [ ] Card geometry on Today: anything misaligned against its neighbours?

### 1.6 The seven zero states

The EmptyState rollout carries the onboarding burden for anyone who skips. Easiest seen
via dev menu → "Persona: new user", **after** stage 1.

- [ ] Spent, Upcoming, habits, categories, kept, leaks, and the insights zero state: do
      they read as one system?
- [ ] Does each one tell you what to do next, rather than only stating that a list is empty?

## Results, part 1

| Screen / flow | Pass? | Finding |
|---|---|---|
| Upgrade: Upcoming projects, no duplicates | | |
| Upgrade: opens on Today, not onboarding | | |
| Carousel, three beats | | |
| Scan: intake and scope | | |
| Scan: scope confirmed with nothing selected | | |
| Scan: habit deck | | |
| Scan: payoff figures match the statement | | |
| Scan: bills reach Upcoming | | |
| Palette in daylight | | |
| Save convention, four sheets | | |
| Today craft round | | |
| The seven zero states | | |

## Part 2: the accessibility pass

Everything below is the walk as originally scoped: Dynamic Type and VoiceOver.

**Dynamic Type:** Settings → Accessibility → Display & Text Size → Larger Text
→ turn on "Larger Accessibility Sizes". Walk the app twice: once at **XL**
(one notch past the largest default) and once at the **largest AX size**.

**VoiceOver:** Settings → Accessibility → VoiceOver. Set the Accessibility
Shortcut (triple-click the side button) first so you can get out.

Gestures you need: swipe right/left to move focus, double-tap to activate,
two-finger Z to dismiss a sheet, rotor (two-finger rotate) → Headings.

### What "pass" means

- **Dynamic Type:** nothing is clipped, cut off, or overlapping. Text may
  wrap, shrink, or push the screen taller. Money amounts stay readable
  (spec 09 section 1 rule 6: they scale, they never truncate).
- **VoiceOver:** every control announces what it is and what it does; focus
  order matches reading order; nothing traps you; nothing announces as an
  unlabeled "button" or an empty node.

Record a row per screen in the results table at the bottom. A finding is worth
logging even if you are not sure it is wrong.

### Priority order

Do these first. They are where the code says the risk is, and the first four
are the core loop.

### 1. Today: the check-in card, at XL and AX

The two answer buttons ("Skip it, keep $6.00" and "I bought it") are the one
place large text must not degrade, and spec 09 section 2 requires them to
stack vertically past XL. That stacking was specified in Phase 2 and only
built now, so this is its first real look.

- [ ] At XL: are the buttons stacked, full width, one above the other?
- [ ] Is either label clipped or ellipsized at any size?
- [ ] The "Missed yesterday?" backfill pair: same question.
- [ ] Tap Skip. Does the haptic still feel immediate? It now fires *after* the
      write lands rather than on touch, so any perceptible lag is a finding.
- [ ] VoiceOver: does the confirmation get announced once, not twice, and not
      mid-word?

### 2. Today: the kept band

A 42pt display serif with nothing to wrap onto. Now capped at the ratified
1.3 serif-money multiplier with shrink-to-fit.

- [ ] At AX: is the amount whole and on one line, or is it cut off?
- [ ] Does it still read as the hero of the screen, or has it shrunk too far?
- [ ] VoiceOver: one utterance ("Kept so far, $X, money you didn't spend"),
      not three fragments.

### 3. Leak scan results, at XL and AX

The densest screen: tier badges render three times in the KPI row alone, plus
once per habit card. All the pills were fixed-height around 11pt text.

- [ ] Tier badges ("Solid" / "Likely" / "Review"): text inside the pill?
- [ ] Habit card class and pace pills: same.
- [ ] KPI row: do the three stat cards still read, or has the row collapsed?
- [ ] Screen title clear of the status bar and dynamic island?
- [ ] VoiceOver: each KPI card should be ONE stop reading label, figure, then
      caveat. If you hear a dozen loose fragments, that is a finding.
- [ ] Rotor → Headings: can you jump between the screen's sections?

### 4. Sheets, with VoiceOver on

Focus now moves into a sheet when it opens (spec 09 section 3 flow 2). Nothing
did this before, so this is new behaviour on every sheet in the app.

Try: log an expense, add an upcoming bill, the pick-one sheet, currency,
add category, and a delete confirm.

- [ ] When the sheet opens, does focus land inside it, on or near the title?
- [ ] Can you reach every control in it?
- [ ] Two-finger Z: does the sheet dismiss?
- [ ] On dismiss, does focus return somewhere sensible?
- [ ] Known open question (UX-041): the grab handle implies a swipe-to-dismiss
      that no code implements. Does that bother you on device?

### 5. The three must-pass flows (spec 09 section 3)

End to end, VoiceOver only, no peeking at the screen:

- [ ] **Log an expense:** open the log sheet → amount → category → Save →
      hear the confirmation.
- [ ] **Track a leak:** leak card → "Break it" → pick-one sheet → accept or
      edit "One skip keeps" → Start → land on the breaking-now card.
- [ ] **Skip / slip:** check-in card → Skip → hear the confirmation → hear the
      coach line.

### 6. Tab bar and headers at XL

- [x] Tab labels: is "Categories" ellipsized? **It was**, verified on the iPhone 16
      simulator 2026-09-05: at accessibility-XXXL it read "Cate" and Insights read
      "Ins". The 1.5 cap did not help because the clipping is horizontal, not
      vertical. Fixed by ADR 0037 with `adjustsFontSizeToFit` floored at the
      default 11pt; all four labels are whole words at XXXL now. Re-check on
      device.
- [ ] Tab bar selected state: is the pill plus heavier stroke obvious at arm's
      length, and does the 1px sage border read as too heavy? (ADR 0037)
- [ ] Screen headers: 34pt serif titles at 1.5 wrap to two or three lines. Do
      they still sit correctly beside the header action buttons?

### 7. Money rows at XL

Amounts previously carried a hard single-line cap and would ellipsize the
number itself. They now shrink to fit instead.

- [ ] Money tab, Spent list: are amounts complete?
- [ ] Money tab, Upcoming list: amount and cadence both readable?

### 8. Category screens

- [ ] Categories tab and a category detail at XL: any clipping in the rows,
      the six-month trend, or the top-merchant list?
- [ ] Rotor → Headings on category detail: do the section titles show up?

### 9. While you are in there

- [ ] Cold boot once and eyeball the splash (the P0-4 item that has been
      riding along since the icon work).
- [ ] Settings → every row announces its value ("Currency, US dollar").

### Accessibility Inspector

If you have a Mac: Xcode → Open Developer Tool → Accessibility Inspector,
target the device, run the audit on Today, the leak-scan results screen, habit
detail, and the log sheet. ADR 0008's acceptance is "no critical issues" on
those screens.

## Results, part 2

Fill this in as you go. Anything that is not a clean pass becomes an issue.

| Screen / flow | Text size | Pass? | Finding |
|---|---|---|---|
| Check-in card | XL | | |
| Check-in card | AX max | | |
| Kept band | AX max | | |
| Leak scan results | XL | | |
| Leak scan results | AX max | | |
| Sheets, VoiceOver focus | default | | |
| Flow 1, log an expense | default | | |
| Flow 2, track a leak | default | | |
| Flow 3, skip / slip | default | | |
| Tab bar + headers | XL | | |
| Money rows | XL | | |
| Category screens | XL | | |
| Splash on cold boot | default | | |
| Accessibility Inspector | n/a | | |

## What this pass cannot verify

Say so rather than ticking a box that means nothing.

The silent-write fix (`aded615`) changed what happens when a storage write fails: it can
no longer report success. Both halves of that are invisible here. The success path looks
exactly like it always did, and the failure path needs a genuinely full disk to trigger,
which you cannot arrange on a walk.

The one part a device can catch is timing. The haptic on the core loop now fires after
the write lands instead of on touch, so any lag you can perceive when you tap Skip is a
real finding. Part 2 section 1 already asks for that.

Exercising the failure path properly would need a dev-menu toggle that forces the next
write to reject. That is new product code, so it is a separate decision, not something
this walk covers.

## Known and already accepted

Do not re-log these:

- **Onboarding carousel media:** the three beats render labelled empty
  frames, not video. `components/onboarding/BeatMedia.tsx:40-47` does this on
  purpose, so the carousel is "honestly incomplete rather than quietly showing
  a fake" until the captures exist. Empty frames are expected. Judge the layout
  around them, not their contents.
- **UX-012:** the leak-scan pipeline runs synchronously on the JS thread, so
  "Reading your files" is a frozen frame and VoiceOver focus stalls during it.
  Open, tracked, and outside this pass.
- **SpendPulse year view:** 53 columns cannot reach 44pt. Accepted in
  `docs/design-package-phase2/09b-p2-5-a11y-code-audit-results.md`.
- **Light mode only** and **iPhone portrait only** are ratified product
  decisions (ops ADR 0017), not accessibility gaps.
