# Localization routine: handoff

## Status

In progress. No REVIEW FEEDBACK pending at run start. Converted 7 more
files to `useStrings()`: `CurrencySheet.tsx`, `LanguageSheet.tsx`,
`QuickLogRow.tsx`, `ExpenseRow.tsx`, `LoggedTodayList.tsx`,
`HabitsList.tsx`, `SpentList.tsx`. 43 files converted total now (2 shared
+ 41 leaves).

## Completed

- Plan item 1, full (earlier run): `expo-localization`, `utils/locale.ts`,
  `utils/storage.ts` override get/set, `contexts/LocaleContext.tsx`,
  Profile's Language row + `LanguageSheet` (cosmetic only, no catalog yet).
- Plan item 2, typed-API slice (earlier run): `utils/i18n.ts` (`Catalog`,
  `getCatalog`, `useStrings()`). No call sites touched that run.
- Plan item 2, call-site migration (earlier runs, runs 1-9): 36 files
  (`ScreenHeader.tsx`, `Sheet.tsx`, the `ResultsScreen`-tree batch, and 34
  leaves through `app/profile.tsx`). Full detail in PLAN.md.
- Plan item 2, this run (run 10), two commits' worth of work landed as one
  commit:
  - `CurrencySheet.tsx`, `LanguageSheet.tsx`, `QuickLogRow.tsx`,
    `ExpenseRow.tsx`, `LoggedTodayList.tsx`, `HabitsList.tsx`: six ordinary
    leaves, no module-scope complication, each confirmed single-parent
    (or two-parent for `ExpenseRow`) via precise `import.*ComponentName`
    grep before picking. Only `quickLogRow.test.tsx` needed `LocaleProvider`
    added (its own leaf-only test); every other importer's test file was
    already covered from earlier runs (`profile`, Today's 4,
    `moneyHabitsTab`, `loggedTodayList` which already carried it).
  - `SpentList.tsx`: its `dayLabelFor` is a third confirmed instance of the
    module-scope *helper-function* shape (`CheckInCard.tsx`'s
    `chapterCopy`/`confirmationCopy`, `PickOneSheet.tsx`'s `cadenceLabel`).
    Fixed the same way: added a `strings: Catalog` parameter, threaded
    from `useStrings()` at `dayLabelFor`'s two call sites inside
    `renderSectionHeader`. Only its leaf-only `spentList.test.tsx` needed
    `LocaleProvider`; the two screen-level tests that mount it
    (`moneyMaterializerIntegration`, `emptyStateSurfaces`) already had it.
  - `tsc --noEmit` clean and full suite run (not just touched files)
    after this run's commit: 109/109 suites, 1147/1147 tests green.

## Next

- 27 files still import the static `strings` catalog directly outside
  `__tests__/` (rerun `grep -rl "from '@/constants/strings'" app
  components contexts utils | grep -v __tests__` to get the current
  list). Continue picking genuinely small single-parent leaf files from
  it (re-run the leaf-verification grep per candidate every time; check
  for all three now-confirmed module-scope shapes, array/helper-function/
  plain-const, before assuming a file's cost).
- `components/money/UpcomingList.tsx` found and deferred this run: its
  `WINDOW_LABELS` is the module-level *array* shape (same fix as
  `SpendPulse.tsx`/`LongArc.tsx`, moving the array construction into the
  component body). Only importer is `app/(tabs)/money.tsx`, already
  covered, but its own leaf-only `upcomingList.test.tsx` will need
  `LocaleProvider` added when this is picked up.
- The 13 `ScreenHeader` importers' and remaining `Sheet` importers' own
  `strings` usage are themselves future leaf picks once the two shared
  components are done. For these, re-run the "does the parent screen
  already carry `LocaleProvider` for a shared-component reason" check
  before assuming a fresh test-file list is needed.
- The leak-scan screen set (`BillsScreen.tsx`, `DeckScreen.tsx`,
  `GracefulFailure.tsx`, `IntakeScreen.tsx`, `PayoffScreen.tsx`,
  `PulseDayDetailSheet.tsx`, `ResultsScreen.tsx`, `ScopeScreen.tsx`,
  `useTrackLeak.tsx`) has not been individually leaf-checked yet; several
  of these are the screens themselves (unconditionally mounted, wide
  blast radius), not ordinary leaves, so budget more than one run's
  bounded slice for this set and check each file's actual mount
  conditions before estimating cost.
- `utils/coachMoments.ts`, `utils/recurring.ts` are plain functions (not
  components or hooks) that import `strings`; they need the catalog
  passed in as a parameter instead of `useStrings()`. Decide that shape
  when their turn comes. `contexts/ReportsContext.tsx` is in the same
  boat (a context provider, not itself hook-eligible the same way).
- `components/today/ViewQuote.tsx` and `useViewQuote.ts` are RETIRED
  (ADR 0037, nothing renders them any more, kept only as a documented
  revert path). Low priority since no live surface depends on them, but
  still on the remaining-files list; convert last, or note explicitly if
  skipped as out of scope for a "full internationalization of the app a
  user experiences" reading of the plan.
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
  language persists the override and nothing on screen changes yet,
  because most components still read the static English `strings` export
  and no non-English catalog exists. 43 files (2 shared, 41 leaves) are
  wired through `useStrings()` so far; all still resolve to English
  either way until plan item 4 lands catalogs, so this is not yet
  observable. Expected, not a bug.
- `contexts/LocaleContext.tsx`'s `detectDeviceLocale()` call is wrapped in
  try/catch with a `DEFAULT_LOCALE` fallback, so mounting `LocaleProvider`
  in a test does NOT require mocking `expo-localization`; several already-
  green leaf tests (e.g. `habitLeakRow.test.tsx`) carry `LocaleProvider`
  with no such mock. Mocking it explicitly (as `languageSheet.test.tsx`,
  `profile.test.tsx`, `i18n.test.tsx` do) is only needed when a test
  actually asserts on the detected locale value itself; a plain leaf
  conversion does not need it.
- Useful check before picking the next file to convert: a component is
  only a safe small leaf if (a) `grep -rn "import.*\bComponentName\b"` outside
  `__tests__/` finds few real import sites (a plain-name grep like
  `grep -rl "ComponentName"` produces false positives from doc-comment
  cross-references in unrelated files, this run's `ExpenseRow`/`EmptyState`/
  `CheckInCard` hits among them; always confirm with the `import.*` form
  before ruling a file in or out), AND (b) every file that imports the
  component outside `__tests__/` mounts it conditionally, or is itself
  only reachable from a small test surface. For a component whose hooks
  run unconditionally on mount (like `Sheet.tsx`, and unlike most leaves),
  check (b) has to trace every importer's own mount site too, not just
  stop at "no direct test file found": the importer may be reached only
  through a bigger screen.
- 2026-09-06, out-of-band CI fix (not a scheduled run, a reaction to a
  check_run.completed failure notification on PR #134): main added 3 new
  test files (`moneyPager.test.tsx`, `scanSnapshotFooter.test.tsx`,
  `insightsFirstScan.test.tsx`, all 2026-09-06) that render `ScreenHeader`
  and/or `ScanSnapshotCard`, both already converted to `useStrings()` on
  this branch, but their provider wrappers predate `LocaleProvider`. Fixed
  by rebasing onto latest main, then adding `LocaleProvider` + the
  standard `expo-localization` mock to all three files. This is a standing
  risk for the rest of plan item 2: any new test file landing on main for
  an already-converted shared component (`ScreenHeader`, `Sheet`) will
  fail the same way until this branch rebases and picks it up. Re-run
  `tsc` + the full suite after every rebase, not just after this routine's
  own commits, to catch it early. This run's rebase was already clean
  (branch was current with `origin/main` at session start, no new commits
  to pick up), so nothing new surfaced this time.
- Three module-scope shapes are now confirmed among files still importing
  static `strings`, costed differently: a module-level *array* built from
  `strings.xxx` (`SpendPulse.tsx`, `LongArc.tsx`, `UpcomingList.tsx`
  found-and-deferred this run) and a module-level *helper function* that
  reads `strings` directly (`CheckInCard.tsx`'s `chapterCopy`/
  `confirmationCopy`, `PickOneSheet.tsx`'s `cadenceLabel`, `SpentList.tsx`'s
  `dayLabelFor` fixed this run) both need restructuring or a threaded
  parameter; the third, a plain module-level `const` built from a single
  `strings.xxx` value (`app/profile.tsx`'s `SUPPORT_MAILTO_URL`), is the
  cheapest of the three, just a one-line `useMemo`. Check which shape (if
  any) a flagged file actually has before estimating its cost.
- Whenever a conversion touches a `useMemo`/`useCallback` body that reads
  `strings`, add `strings` to its dependency array in the same edit (the
  run 8 review feedback caught one miss; do not repeat it).

## REVIEW FEEDBACK

None pending.
