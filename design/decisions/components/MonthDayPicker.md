# MonthDayPicker (components/money/MonthDayPicker.tsx)

## Direction (current)
A month and a day, for the two places in the bill sheet that need to name a date: the yearly anchor, and a one-time bill further out than "next month". A scrolling rail of twelve months over a seven-column grid of days, then the resulting date echoed in words underneath.

Built from `Chip`. It is not a calendar and does not try to be: no weekday columns, no month paging, no past. A bill's anchor is a month and a number, and that is all this asks for.

## States
- Month selected, day selected: the common case, with the echo reading "September 11".
- A day the month does not have: **disabled, not hidden**. February shows 29 live and 30/31 dimmed. Reach: pick Feb.
- `dayUnknown`: the day grid and the echo are gone, leaving the month rail alone. Reach: the "I don't know the day" answer, when it lands.

## Decisions
- 2026-09-11 (Charen): **built from `Chip`, not a native picker.** Why: there is no date picker anywhere in this repo, and adding `@react-native-community/datetimepicker` would touch `package.json`, which `scripts/ota-eligible.sh` treats as a native change. The whole feature would then need an App Store round trip instead of a two-minute `eas update`. A JS-only control is not the compromise here, it is the only version that ships this week.
- 2026-09-11: **a day grid, not a stepper.** The `custom` cadence's `StepperButton` was the zero-new-code option and about 220pt shorter. Rejected: fourteen taps to reach the 14th is the kind of friction that makes a control go unused, and this one exists precisely because the previous answer (no control at all) was unusable. Revisit if the grid feels wrong in hand.
- 2026-09-11: **the day cells are fixed-width, which is why `Chip` grew a `width` prop.** Chips size to their label, so "1" beside "10" made a wrapping row of 31 read as ragged text rather than as a grid you can count columns in. Seen on device before and after. Seven columns because the week is the mental model a user already has for "the 14th"; 7 x 42 plus six 6pt gaps is 330, inside the sheet's ~353pt.
- 2026-09-11: **days a month does not have are disabled rather than hidden.** Hiding them reflows the grid under a finger already moving toward a cell.
- 2026-09-11: **month names are derived, never catalogued.** `formatDate(ref, { month: 'short' })` off a mid-month reference date, the same trick `weekdayShortLabel` uses in the sheet, so twelve locales come free and nothing needs translating (ADA-008). The reference is mid-month so no timezone shift can roll it into a neighbour.
- 2026-09-11: **the rail opens on the selected month.** A December anchor sits off the right edge of twelve chips, so it scrolls on mount only. Scrolling on every change would fight the user's own drag. Same reasoning as `CategoryChipRow`'s `scrollToSelected`.

## Open
- The rail's scroll-to-selected uses an estimated chip width rather than a measured one, so it lands near the selection rather than exactly on it. Fine for twelve items; would not be for more.
- Not yet felt in hand at accessibility text sizes. The day cells are fixed-width and their labels scale, so this is the likeliest place it breaks.
- `once` does not use it yet. It is built for two hosts and currently has one.

## Iterations
- 2026-09-11: created, for the yearly anchor.
