# Localization routine: handoff

## Status

In progress. No REVIEW FEEDBACK pending at run start. Converted three
files this run: `app/(tabs)/_layout.tsx`, `app/(tabs)/money.tsx`,
`app/(tabs)/categories.tsx`. 54 files converted total now (2 shared + 52
leaves/screens).

## Completed

- Plan item 1, full (earlier run): `expo-localization`, `utils/locale.ts`,
  `utils/storage.ts` override get/set, `contexts/LocaleContext.tsx`,
  Profile's Language row + `LanguageSheet` (cosmetic only, no catalog yet).
- Plan item 2, typed-API slice (earlier run): `utils/i18n.ts` (`Catalog`,
  `getCatalog`, `useStrings()`). No call sites touched that run.
- Plan item 2, call-site migration (earlier runs, runs 1-12): 51 files
  (`ScreenHeader.tsx`, `Sheet.tsx`, the `ResultsScreen`-tree batch, and 49
  leaves through `AddUpcomingSheet.tsx`). Full detail in PLAN.md.
- Plan item 2, this run (run 13): three files, all ordinary leaf-shaped
  screens with no module-scope pattern (checked before starting, per the
  standing caution):
  - `app/(tabs)/_layout.tsx` (found run 12): its four `strings.tabs.*` tab
    titles sit inside `TabLayout`'s component body (passed to
    `Tabs.Screen options`), not module scope, so this was a plain
    `useStrings()` swap despite being a top-level layout component mounted
    unconditionally. No test file renders the tab layout directly
    (confirmed via grep), so no test file changes were at risk either way.
  - `app/(tabs)/money.tsx`: six `strings.` usages, all inside
    `MoneyScreen`'s body. The `segments` `useMemo` was missing `strings`
    from its deps array (added). All four test files that render this
    screen (`moneyUpcomingTab`, `moneyMaterializerIntegration`,
    `moneyHabitsTab`, `moneyPager`) already had `LocaleProvider`; no test
    file changes needed.
  - `app/(tabs)/categories.tsx`: usages inside `CategoriesScreen`'s body,
    including one function-valued string
    (`strings.categories.deleteTitle(name)`) called directly in JSX. The
    `sections` `useMemo` was missing `strings` from its deps (added). Both
    test files that render this screen (`categoriesEmptyState`,
    `categoriesDeleteConfirm`) already had `LocaleProvider`; no test file
    changes needed.
  - All three converted in one commit each; `tsc --noEmit` clean and the
    full suite green (109/109, 1147/1147) after every commit.

## Next

- 21 files still import the static `strings` catalog directly outside
  `__tests__/` (rerun `grep -rl "from '@/constants/strings'" app
  components contexts utils | grep -v __tests__` for the current list).
  Five app screens not yet individually leaf-checked for module-scope
  shapes: `app/(tabs)/index.tsx` (Today, 34 `strings.` hits, ~1450 lines,
  the largest screen in the app, budget a dedicated run), `app/paywall.tsx`
  (26 hits), `app/habit/[id].tsx` (21 hits), `app/category/[id].tsx`
  (15 hits), `app/(tabs)/insights.tsx` (12 hits). Check each for module-
  scope arrays/consts/helper-functions before estimating cost, same
  process as every prior pick.
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
  and no non-English catalog exists. 54 files (2 shared, 52 leaves/screens)
  are wired through `useStrings()` so far; all still resolve to English
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
- A full-screen file (an `app/` route or tab, as opposed to a leaf
  component under it) is safe to convert the same lightweight way as long
  as every `strings.` usage sits inside the screen's own component body:
  grep `strings\.` line numbers against the function's start/end before
  assuming it needs the shared-component treatment `ScreenHeader.tsx`/
  `Sheet.tsx` needed. `_layout.tsx`, `money.tsx`, `categories.tsx` were all
  this shape this run. `app/(tabs)/index.tsx` is a likely counter-example
  given its size (34 hits across ~1450 lines) -- leaf-check it properly,
  do not assume it is another quick win just because the pattern held
  three times in a row.
- Four module-scope shapes are now confirmed among files still importing
  static `strings`, costed differently: a module-level *array* built from
  `strings.xxx` (fixed by moving into a `useMemo` in the component body);
  a module-level *helper function* that reads `strings` directly (fixed
  by adding a `strings: Catalog` parameter, threaded from `useStrings()`
  at every call site, including any OTHER module-level function that
  calls it, like `AddUpcomingSheet.tsx`'s `draftFromExpense`); a plain
  module-level `const` built from a single `strings.xxx` value (a
  one-line `useMemo`); and an **exported array used as a test fixture
  elsewhere** (`OnboardingCarousel.tsx`'s `BEATS`), fixed by extracting a
  `buildX(catalog)` function and keeping the export as `buildX(strings)`
  with the static import, so the fixture and any default-prop shape stay
  unchanged while the real render path calls `useStrings()`. Grep the
  candidate's own exports (not just its internals) before assuming a
  module-level array is purely private.
- Whenever a conversion touches a `useMemo`/`useCallback` body that reads
  `strings`, add `strings` to its dependency array in the same edit. Two
  more caught this run (`money.tsx`'s `segments`, `categories.tsx`'s
  `sections`) that were pre-existing `useMemo`s with other deps already
  present, easy to miss when scanning only for `strings.` hits and not
  also checking every enclosing `useMemo`/`useCallback`'s deps array.
- Standing rebase risk (from run 11's out-of-band CI fix): any new test
  file landing on main for an already-converted shared component
  (`ScreenHeader`, `Sheet`) will fail the same LocaleProvider-missing way
  until this branch rebases and picks it up. Re-run `tsc` + the full
  suite after every rebase, not just after this routine's own commits.
  This run's rebase was a no-op (branch was already current with
  `origin/main` at session start, 0 commits behind).
- Pre-existing flake, not this stream's bug: `door3BreakSheet.test.tsx`
  timed out once under full-suite load at the very start of this run
  (before any code change this session), then passed standalone and on
  every full-suite re-run afterward (three full-suite runs total this
  session, all 109/109 otherwise). If it recurs and blocks a commit,
  re-run once before treating it as a real regression; it is unrelated to
  the `strings`/`useStrings()` conversion work.

## REVIEW FEEDBACK

None pending.
