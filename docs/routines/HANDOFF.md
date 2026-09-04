# Localization routine: handoff

## Status

In progress. Plan item 1 (device locale + language override foundation) is
done; item 2 (typed strings API + catalog conversion, the ~640-key file)
is next and is the big one.

## Completed

- Plan item 1, full: `expo-localization` installed (SDK-54 bundled
  version, ~17.0.9); `utils/locale.ts` (LocaleCode union, LOCALES display
  metadata, pure `matchDeviceLocale` matcher, `detectDeviceLocale`
  wrapper); `utils/storage.ts` `getLocaleOverride`/`setLocaleOverride`;
  `contexts/LocaleContext.tsx` (mirrors CurrencyContext, wired into
  `app/_layout.tsx`); a Language row on Profile opening `LanguageSheet`
  (mirrors CurrencySheet). Tests: `__tests__/locale.test.ts`,
  `__tests__/localeStorage.test.ts`, `__tests__/languageSheet.test.tsx`,
  plus `setLocaleOverride` added to the write-policy suite and
  `LocaleProvider` added to `__tests__/profile.test.tsx`'s provider stack.
- tsc clean, 101 suites / 1089 tests passing (up from 98 / 1069 baseline).

## Next

- Plan item 2: design the typed strings API (call sites should barely
  change), then convert `constants/strings.ts` (1165 lines, ~24 top-level
  sections) into an English catalog under it. This is the largest item in
  the plan; expect it to span several runs. Function-valued strings need
  real ICU plural rules, not the current `n === 1 ? '' : 's'` ternaries.
  Add the ICU formatting dependency (`i18n-js` or alternative) once the
  catalog loader's actual needs are known, rather than the unused
  dependency this run avoided installing.
- A reasonable first slice: land the typed API + loader plumbing with only
  the `common` and `sheets` sections migrated end to end (smallest
  sections, exercises the whole path), verified with existing tests still
  green, before doing the remaining ~22 sections in later runs.

## Blockers

None.

## DECISIONS NEEDED

Nothing yet. leak/skip/kept/slip and the app's quotes stay in English
(unconverted) until plan items 2 to 4 reach them; the proposal table for
Charen lands here once provisional translations exist to propose (plan
item 4).

## Notes for the next run

- `npm run lint` (`expo lint`) fails in this sandbox on a network call to
  Expo's compatibility API (`Host not i...` JSON parse error), unrelated to
  this change. It is not one of the routine's required checks (tsc +
  jest), so it was not chased down; flagging in case a future run needs it
  and hits the same wall.
- `npx expo install <pkg>` fails the same way (same underlying network
  call); `npm install <pkg>@<bundled-version>` (read the target version
  from `node_modules/expo/bundledNativeModules.json`) works and matches
  what `expo install` would have picked.
- The Language picker is live in Settings but is cosmetic only right now:
  selecting a language persists the override and nothing else changes,
  because no catalog exists yet. That is expected until plan item 2 and 4
  land; do not read it as a bug.
