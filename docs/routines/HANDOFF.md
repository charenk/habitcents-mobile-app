# Localization routine: handoff

## Status

In progress. Plan item 2's call-site migration is underway: 3 files
converted this run, ~69 remaining. No REVIEW FEEDBACK pending.

## Completed

- Plan item 1, full (prior run): `expo-localization`, `utils/locale.ts`,
  `utils/storage.ts` override get/set, `contexts/LocaleContext.tsx`,
  Profile's Language row + `LanguageSheet` (cosmetic only, no catalog yet).
- Plan item 2, typed-API slice (prior run): `utils/i18n.ts` (`Catalog`,
  `getCatalog`, `useStrings()`). No call sites touched that run.
- Plan item 2, call-site migration (this run): converted 3 files from
  `import { strings } from '@/constants/strings'` to
  `const strings = useStrings();`: `components/ui/InfoRibbon.tsx`,
  `components/settings/SettingsRow.tsx`,
  `components/insights/WhereItWentCard.tsx`. Added `LocaleProvider` to the
  6 test files that needed it (their own `Providers` wrapper, matching how
  `CurrencyProvider` rolled out): `__tests__/door1FirstRun.test.tsx`,
  `__tests__/door3BreakSheet.test.tsx`, `__tests__/todaySpentKept.test.tsx`,
  `__tests__/loggedTodayList.test.tsx`,
  `__tests__/todayQuoteRibbonPlacement.test.tsx` (all pull in InfoRibbon
  through Today's logged-today list), `__tests__/emptyStateSurfaces.test.tsx`
  and `__tests__/insightsFirstScan.test.tsx` (WhereItWentCard). No test
  needed a new wrapper for SettingsRow: `__tests__/profile.test.tsx`
  already had `LocaleProvider` wired in from a prior run.
- Correction to the file order this run's diff also records in
  `docs/routines/PLAN.md`: `CategoryTransactionsSheet.tsx` looked like a
  small leaf in the original plan text but is not one. It is mounted
  unconditionally inside `ResultsScreen.tsx` (only its own return value is
  conditionally null), so migrating it would require adding
  `LocaleProvider` to 7 test files, not "a couple." Left unconverted this
  run; see PLAN.md item 2 for the full affected-file list and the
  before-picking check to run next time (grep the component in
  `__tests__/`, then grep where its parent is imported to rule out an
  unconditionally-mounted bigger screen sitting upstream).
- tsc clean, 103 suites / 1099 tests passing (unchanged count from last
  run's baseline; this run only touched imports/wrappers, added no new
  tests).

## Next

- Continue call-site migration. `components/insights/PaceCard.tsx` is
  verified as the same safe shape as `WhereItWentCard.tsx` (single parent,
  `app/(tabs)/insights.tsx`, only 2 test files, neither yet checked for
  existing `LocaleProvider` wiring) and is a good next pick.
- After that, `components/ui/Sheet.tsx` and `components/ui/ScreenHeader.tsx`
  are the two foundational files most of the app depends on. Their test
  blast radius has not been measured yet; do that measurement (same grep
  technique) before starting the conversion, and expect it to be large
  enough to want its own bounded run rather than combining it with other
  file conversions.
- `CategoryTransactionsSheet.tsx` and its `ResultsScreen`-tree neighbors
  (`CategoryList.tsx`, `CategoryRow.tsx`, `TierBadge.tsx`, `KpiRow.tsx`,
  `HabitCard.tsx`, `ProjectionSection.tsx`, `ReviewQueueSheet.tsx`) are
  best done together as one batch once picked up, since they share the
  same 7+ test files needing `LocaleProvider`.
- Once a meaningful slice of files is migrated, plan item 3 (test
  migration away from literal-English assertions) can start for those
  files.

## Blockers

None.

## DECISIONS NEEDED

Nothing yet. leak/skip/kept/slip and the app's quotes stay in English
(unconverted) until plan items 2 to 4 reach them; the proposal table for
Charen lands here once provisional translations exist to propose (plan
item 4).

## Notes for the next run

- This container had no `node_modules` at session start (fresh checkout);
  `npm install` was needed before `tsc`/`jest` would run at all. Expect the
  same on a fresh container next time.
- `npm run lint` (`expo lint`) still fails in this sandbox on a network call
  to Expo's compatibility API, unrelated to this change and not one of the
  routine's required checks (tsc + jest). Same as last run.
- `npx expo install <pkg>` fails the same network way; use
  `npm install <pkg>@<bundled-version>` (read the version from
  `node_modules/expo/bundledNativeModules.json`) instead.
- The Language picker in Settings is still cosmetic only: selecting a
  language persists the override and nothing on screen changes yet, because
  most components still read the static English `strings` export and no
  non-English catalog exists. Expected until call-site migration (item 2)
  and provisional translations (item 4) land further; not a bug.
- Useful check before picking the next file to convert: a component is
  only a safe small leaf if (a) `grep -rl "<ComponentName" __tests__` finds
  few files, AND (b) every file that imports the component outside
  `__tests__/` mounts it conditionally, or is itself only reachable from a
  small test surface. Skipping check (b) is what made
  `CategoryTransactionsSheet.tsx` look smaller than it is (see PLAN.md).
