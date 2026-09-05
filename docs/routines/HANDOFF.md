# Localization routine: handoff

## Status

In progress. Plan item 2: `Sheet.tsx` converted to `useStrings()` this run,
the second of the two flagged foundational components (`ScreenHeader.tsx`
was the first, prior run). No REVIEW FEEDBACK pending from the orchestrator
this run.

## Completed

- Plan item 1, full (earlier run): `expo-localization`, `utils/locale.ts`,
  `utils/storage.ts` override get/set, `contexts/LocaleContext.tsx`,
  Profile's Language row + `LanguageSheet` (cosmetic only, no catalog yet).
- Plan item 2, typed-API slice (earlier run): `utils/i18n.ts` (`Catalog`,
  `getCatalog`, `useStrings()`). No call sites touched that run.
- Plan item 2, call-site migration (earlier runs): converted 6 leaf files
  (`InfoRibbon`, `SettingsRow`, `WhereItWentCard`, `PaceCard`, `LeaksCard`,
  `ScanSnapshotCard`), then `ScreenHeader.tsx` (prior run, with `LocaleProvider`
  added to 16 test files).
- Plan item 2, `Sheet.tsx` conversion (this run): its one `strings` usage
  (`accessibilityLabel={strings.common.close}`) now reads
  `const strings = useStrings();` inside the component. `Sheet.tsx` is
  imported by 13 leaf sheet components (`PartialSlipSheet`, `PickOneSheet`,
  `CategoryTransactionsSheet`, `PulseDayDetailSheet`, `ReviewQueueSheet`,
  `AddUpcomingSheet`, `ExpenseSheet`, `BreakHabitSheet`, `CurrencySheet`,
  `LanguageSheet`, `ConfirmSheet`, `AddCategoryModal`,
  `EditSkipValueSheet` in `app/habit/[id].tsx`); none of their own `strings`
  usage was touched, this is the shared component only.
- Blast-radius handling (this run, the reason this took the full run): unlike
  a normal leaf, `Sheet`'s hooks run on every mount regardless of the
  `visible` prop, and 4 of its 13 importers (`CategoryTransactionsSheet`,
  `PulseDayDetailSheet`, `ReviewQueueSheet`, `BreakHabitSheet`) have no
  dedicated unit test, reached only by being unconditionally mounted inside
  `ResultsScreen.tsx` or Today (`app/(tabs)/index.tsx`). Verified that
  `ScreenHeader.tsx`'s test-file list from last run already covers this,
  since `ScreenHeader` renders on the same screens (Today, Money, Insights,
  Categories, Profile, habit/category detail, the leak-scan screens): every
  full-screen test file already carried `LocaleProvider` before this run
  touched anything. Added `LocaleProvider` to the 10 remaining files that
  needed it: the 9 leaf-sheet unit tests (`partialSlipSheet`, `pickOneSheet`,
  `addUpcomingSheet`, `silentWrite`, `expenseSheet`, `currencySheet`,
  `confirmSheet`, `addCategoryModal`, `editSkipValueSheet`) plus
  `sheetHeader.test.tsx` (tests `Sheet.tsx` directly via its `header` prop,
  not one of the 13 importers, found by a separate grep).
  `habitsSeedStartSameTick.test.tsx` looked like a Today-screen match on the
  first grep but only mentions `app/(tabs)/index.tsx` in a comment; it has no
  `Sheet` in its render tree at all (a bare `HabitsProvider` harness), so
  needed no change. Full list and reasoning recorded in PLAN.md item 2.
- Two follow-on fixes surfaced by the full suite run, both from
  `LocaleContext.tsx` pulling in `utils/storage.ts` (AsyncStorage) where the
  component under test previously did not need it: `confirmSheet.test.tsx`
  had no async-storage jest mock at all (added); `sheetHeader.test.tsx`
  already had it. Worth checking on any future `ThemeProvider`-only test file.
- `tsc --noEmit` clean, full suite run (not just touched files) 103/103
  suites, 1099/1099 tests green.

## Next

- Continue picking genuinely small single-parent leaf files for plan item 2
  (re-run the leaf-verification grep per candidate every time; for
  components whose parent screen already renders `ScreenHeader` or `Sheet`,
  check whether that parent's test files already carry `LocaleProvider`
  before assuming a fresh test-file list is needed).
- `CategoryTransactionsSheet.tsx` and its `ResultsScreen`-tree neighbors
  (`CategoryList.tsx`, `CategoryRow.tsx`, `TierBadge.tsx`, `KpiRow.tsx`,
  `HabitCard.tsx`, `ProjectionSection.tsx`, `ReviewQueueSheet.tsx`) as one
  deliberate batch: `Sheet.tsx` is already converted underneath them now, so
  only their own `strings` usage remains, and their test-file list is
  already known (the `resultsScreen*` / `leakScanImportUndo` /
  `leakScanOnboardingExit` set).
- The 13 `ScreenHeader` importers' and 13 `Sheet` importers' own `strings`
  usage are themselves future leaf picks once the two shared components are
  done; `app/profile.tsx` is a special case among them (see Notes below).
- `utils/coachMoments.ts`, `utils/recurring.ts` are plain functions (not
  components or hooks) that import `strings`; they need the catalog passed
  in as a parameter instead of `useStrings()`. Decide that shape when their
  turn comes.
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
  almost every component still reads the static English `strings` export and
  no non-English catalog exists. `ScreenHeader`'s back-button label and
  `Sheet`'s scrim-close label are the only on-screen text actually wired
  through `useStrings()` so far; both are still English text either way
  until plan item 4 lands catalogs, so this is not yet observable. Expected,
  not a bug.
- Useful check before picking the next file to convert: a component is
  only a safe small leaf if (a) `grep -rl "<ComponentName" __tests__` finds
  few files, AND (b) every file that imports the component outside
  `__tests__/` mounts it conditionally, or is itself only reachable from a
  small test surface. For a component whose hooks run unconditionally on
  mount (like `Sheet.tsx`, and unlike most leaves), check (b) has to trace
  every importer's own mount site too, not just stop at "no direct test
  file found": the importer may be reached only through a bigger screen.
  Also watch for false-positive matches on the component's own name inside
  a `/** ... */` doc comment cross-referencing another file (this run:
  `CategoryList.tsx`'s and `CategoryTransactionsSheet.tsx`'s own doc
  comments mention `CategoryTransactionsSheet`/`ReviewQueueSheet` without
  importing them; `AmountField.tsx`/`TextField.tsx`/
  `habitsSeedStartSameTick.test.tsx` mention `BreakHabitSheet`/
  `app/(tabs)/index.tsx` the same way); read the matched line, and trace
  route-level imports, before ruling a file in or out.
- `app/profile.tsx` reads `strings.settings.supportEmail` at module scope
  (building `SUPPORT_MAILTO_URL` outside the component), so it is not a
  plain three-line hook swap like every leaf converted so far; note left in
  PLAN.md for whoever picks it.

## REVIEW FEEDBACK

None pending. The 2026-09-05 orchestrator review of runs 1-4 (approved, no
code fixes) was addressed last run; nothing new has landed since.
