# Device pass: VoiceOver and Dynamic Type

The on-device accessibility walk that ADR 0008 deferred to Phase 4 beta, and
that has been owed since build 13. This is the checklist to run on a real
iPhone against a TestFlight build.

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

## Setup

Install the build **over** the existing app. Never delete first: all data is
on-device only, and a fresh install starts you in onboarding with nothing to
look at.

**Dynamic Type:** Settings → Accessibility → Display & Text Size → Larger Text
→ turn on "Larger Accessibility Sizes". Walk the app twice: once at **XL**
(one notch past the largest default) and once at the **largest AX size**.

**VoiceOver:** Settings → Accessibility → VoiceOver. Set the Accessibility
Shortcut (triple-click the side button) first so you can get out.

Gestures you need: swipe right/left to move focus, double-tap to activate,
two-finger Z to dismiss a sheet, rotor (two-finger rotate) → Headings.

## What "pass" means

- **Dynamic Type:** nothing is clipped, cut off, or overlapping. Text may
  wrap, shrink, or push the screen taller. Money amounts stay readable
  (spec 09 section 1 rule 6: they scale, they never truncate).
- **VoiceOver:** every control announces what it is and what it does; focus
  order matches reading order; nothing traps you; nothing announces as an
  unlabeled "button" or an empty node.

Record a row per screen in the results table at the bottom. A finding is worth
logging even if you are not sure it is wrong.

## Priority order

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

- [ ] Tab labels: is "Categories" ellipsized? Capped at 1.5, but the tab is a
      quarter of the screen.
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

## Accessibility Inspector

If you have a Mac: Xcode → Open Developer Tool → Accessibility Inspector,
target the device, run the audit on Today, the leak-scan results screen, habit
detail, and the log sheet. ADR 0008's acceptance is "no critical issues" on
those screens.

## Results

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

## Known and already accepted

Do not re-log these:

- **UX-012:** the leak-scan pipeline runs synchronously on the JS thread, so
  "Reading your files" is a frozen frame and VoiceOver focus stalls during it.
  Open, tracked, and outside this pass.
- **SpendPulse year view:** 53 columns cannot reach 44pt. Accepted in
  `docs/design-package-phase2/09b-p2-5-a11y-code-audit-results.md`.
- **Light mode only** and **iPhone portrait only** are ratified product
  decisions (ops ADR 0017), not accessibility gaps.
