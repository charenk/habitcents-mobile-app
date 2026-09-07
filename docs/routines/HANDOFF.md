# Localization routine: handoff

## Status

In progress. No REVIEW FEEDBACK pending at run start. Converted the four
files run 11 found-and-deferred plus one newly found this run:
`UpcomingList.tsx`, `OnboardingCarousel.tsx`, `BreakHabitSheet.tsx`,
`AddUpcomingSheet.tsx`. 51 files converted total now (2 shared + 49
leaves).

## Completed

- Plan item 1, full (earlier run): `expo-localization`, `utils/locale.ts`,
  `utils/storage.ts` override get/set, `contexts/LocaleContext.tsx`,
  Profile's Language row + `LanguageSheet` (cosmetic only, no catalog yet).
- Plan item 2, typed-API slice (earlier run): `utils/i18n.ts` (`Catalog`,
  `getCatalog`, `useStrings()`). No call sites touched that run.
- Plan item 2, call-site migration (earlier runs, runs 1-11): 47 files
  (`ScreenHeader.tsx`, `Sheet.tsx`, the `ResultsScreen`-tree batch, and 45
  leaves through `BeatMedia.tsx`). Full detail in PLAN.md.
- Plan item 2, this run (run 12): four files, all module-scope shapes
  flagged in earlier runs (three of the four were run 11's explicit
  found-and-deferred list; the fourth was found fresh this run):
  - `UpcomingList.tsx`: module-level array shape (`WINDOW_LABELS`/
    `WINDOW_OPTIONS`), moved into a `useMemo`. Its child `UpcomingRow`
    (a real function component) needed `strings: Catalog` threaded in as
    a prop, since it calls `strings.money.multiPaymentPill` outside the
    parent's hook scope. Leaf-only `upcomingList.test.tsx` needed
    `LocaleProvider` added.
  - `OnboardingCarousel.tsx`: a new fourth module-scope shape, an
    **exported** array (`BEATS`) also used directly as a test fixture in
    `beatMedia.test.tsx`. Converted to `buildBeats(catalog)`; the export
    stays a static English `BEATS = buildBeats(strings)` so the fixture
    and the prop's default type are untouched, while the actual render
    path now resolves beats from `useStrings()` via `useMemo`. No test
    file changes needed (all three, including the `welcome.tsx` render
    tree one, already had `LocaleProvider` from `BeatMedia`'s run-11
    conversion). Note: this file will keep showing up in a
    `grep -rl "from '@/constants/strings'"` sweep because the static
    import stays for building `BEATS`; that is expected, not a missed
    conversion.
  - `BreakHabitSheet.tsx`: exactly the two arrays + one helper function
    run 11 flagged (`CADENCE_OPTIONS`/`BOUGHT_OPTIONS` into `useMemo`s,
    `yearlyLineFor` took an added `Catalog` parameter). Only importer
    already covered by all three of its test files; no test file changes.
  - `AddUpcomingSheet.tsx` (found this run): two module-level arrays
    (`NAME_CHIPS`, `MONTH_DAY_CHIPS`) became builder functions, plus a
    third module-level function (`draftFromExpense`) that read
    `NAME_CHIPS` directly now takes the resolved array as a parameter.
    Only importer already covered by both of its test files; no test
    file changes.
  - `tsc --noEmit` clean and full suite run (not just touched files) after
    each of the four commits: 109/109 suites, 1147/1147 tests green
    throughout.

## Next

- `app/(tabs)/_layout.tsx` (found this run): tab titles,
  `strings.tabs.*`. A top-level layout component, mounted unconditionally
  like `ScreenHeader`/`Sheet`, not yet leaf-checked; confirm whether it
  can call `useStrings()` directly (it is a function component) before
  assuming it needs shared-component-style test-file discovery.
- 22 files still import the static `strings` catalog directly outside
  `__tests__/` (rerun `grep -rl "from '@/constants/strings'" app
  components contexts utils | grep -v __tests__` to get the current
  list; note `OnboardingCarousel.tsx` and `utils/i18n.ts` will always be
  on this list by design, see above). Continue picking genuinely small
  single-parent leaf files from it (re-run the leaf-verification grep per
  candidate every time; check for all four now-confirmed module-scope
  shapes -- array, helper-function, plain-const, exported-array-with-test-
  fixture -- before assuming a file's cost; also grep the parent chain,
  not just the candidate's own name, per the `BeatMedia` lesson).
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
  routine's required checks (tsc + jest).
- `npx expo install <pkg>` fails the same network way; use
  `npm install <pkg>@<bundled-version>` (read the version from
  `node_modules/expo/bundledNativeModules.json`) instead.
- The Language picker in Settings is still cosmetic only: selecting a
  language persists the override and nothing on screen changes yet,
  because most components still read the static English `strings` export
  and no non-English catalog exists. 51 files (2 shared, 49 leaves) are
  wired through `useStrings()` so far; all still resolve to English
  either way until plan item 4 lands catalogs, so this is not yet
  observable. Expected, not a bug.
- `contexts/LocaleContext.tsx`'s `detectDeviceLocale()` call is wrapped in
  try/catch with a `DEFAULT_LOCALE` fallback, so mounting `LocaleProvider`
  in a test does NOT require mocking `expo-localization`; several already-
  green leaf tests carry `LocaleProvider` with no such mock. Mocking it
  explicitly is only needed when a test actually asserts on the detected
  locale value itself.
- Useful check before picking the next file to convert: a component is
  only a safe small leaf if (a) `grep -rn "import.*\bComponentName\b"`
  outside `__tests__/` finds few real import sites (a plain-name grep like
  `grep -rl "ComponentName"` produces false positives from doc-comment
  cross-references in unrelated files; always confirm with the `import.*`
  form before ruling a file in or out), AND (b) every file that imports
  the component outside `__tests__/` mounts it conditionally, or is
  itself only reachable from a small test surface. If the component sits
  inside an UNCONVERTED parent component, grepping the component's own
  name across `__tests__/` can miss real render sites entirely; also grep
  the parent chain up to the screen level and check each hit's doc
  comments for "unconditional"/"always renders" language.
- Four module-scope shapes are now confirmed among files still importing
  static `strings`, costed differently: a module-level *array* built from
  `strings.xxx` (fixed by moving into a `useMemo` in the component body);
  a module-level *helper function* that reads `strings` directly (fixed
  by adding a `strings: Catalog` parameter, threaded from `useStrings()`
  at every call site, including any OTHER module-level function that
  calls it, like `AddUpcomingSheet.tsx`'s `draftFromExpense`); a plain
  module-level `const` built from a single `strings.xxx` value (a
  one-line `useMemo`); and, new this run, an **exported array used as a
  test fixture elsewhere** (`OnboardingCarousel.tsx`'s `BEATS`), fixed by
  extracting a `buildX(catalog)` function and keeping the export as
  `buildX(strings)` with the static import, so the fixture and any
  default-prop shape stay unchanged while the real render path calls
  `useStrings()`. Grep the candidate's own exports (not just its
  internals) before assuming a module-level array is purely private.
- Whenever a conversion touches a `useMemo`/`useCallback` body that reads
  `strings`, add `strings` to its dependency array in the same edit.
- Standing rebase risk (from run 11's out-of-band CI fix): any new test
  file landing on main for an already-converted shared component
  (`ScreenHeader`, `Sheet`) will fail the same LocaleProvider-missing way
  until this branch rebases and picks it up. Re-run `tsc` + the full
  suite after every rebase, not just after this routine's own commits.
  This run's rebase was a no-op (branch was already current with
  `origin/main` at session start).

## REVIEW FEEDBACK

None pending.
