# RemindersSheet (components/settings/RemindersSheet.tsx)

## Direction (current)
The Tier 2 preferences surface behind Profile's Reminders row (reminders spec, ops repo docs/reminders-spec.md): the global switch, the default reminder time, and the denied-permission route. CurrencySheet's selection-sheet shape verbatim: pinned serif title, hairline rows, a pinned tertiary Close. It writes preferences only; every scheduled notification moves through the reconciler, never from here.

## States
- Global on (default): switch row checked, time chips visible, stored preset selected.
- Global off: switch row unchecked, time chips gone (nothing below a dead master switch pretends to work).
- Permission denied while global on: one non-blaming line plus an "Open device settings" row (Linking.openSettings, first use in the app; failure surfaces the linkOpenFailed toast, never a dead end).
- The Profile row mirrors all three: the formatted time, "Off", or "Off in device settings".

## Decisions
- 2026-09-25 (Charen, reminders spec): **the global switch defaults ENABLED.** It is a master override, not a second opt-in: per-bill reminders default off, so two off defaults would make the feature silently dead, with a user turning a bill's reminder on and getting nothing with no indication why. The default lives in utils/storage.ts getReminderPrefs with the same sentence on it.
- 2026-09-25 (Charen): **the default time is 9:00 the day before, picked from four preset chips** (9:00, 12:00, 17:00, 20:00), labels through the locale time formatter (ADA-008, never a hardcoded "9:00 AM"). Chips and not a native picker for MonthDayPicker's reason: `@react-native-community/datetimepicker` would touch package.json and cost OTA eligibility, and the sheet stays in the app's one selection vocabulary. An hour grid (MonthDayPicker's day-grid shape) was the considered alternative; four presets cover the real question ("morning or evening?") at a quarter of the height.
- 2026-09-25: **this sheet exists only because delivery exists.** ADR 0005 deleted the old reminder-time row on the grounds of no settings for a feature that does not deliver; re-adding it before Tier 1 would have re-created exactly that no-op. Shipped in the same wave as delivery, the row is honest.
- 2026-09-25: **the switch row speaks accessibilityRole="switch" with checked state**; visually it is the currency sheet's check-row, not a native Switch (no themed Switch primitive exists, and the one bare Switch in the app is the leak scan's unstyled one).

## Open
- Four presets assume on-the-hour habits; nobody has asked for 8:30 yet. If they do, the hour-grid alternative is the escalation, not a native picker.
- The denied block has only been exercised in tests and simulator; the device pass should walk the full deny-then-grant round trip through iOS Settings and back (the foreground permission refresh should update the sheet live).

## Iterations
- 2026-09-25: born with Tier 2 (global switch, time presets, denied route), alongside Tier 1 delivery.
