# Localization routine: handoff

## Status

In progress. Run 16: no REVIEW FEEDBACK was pending at session start,
branch was already current with origin/main (rebase was a no-op).
Converted `app/(tabs)/index.tsx` (Today), the last unconverted
top-level screen. 60 files converted total now (2 shared + 58
leaves/screens).

## Completed

- Plan item 1, full (earlier run): `expo-localization`, `utils/locale.ts`,
  `utils/storage.ts` override get/set, `contexts/LocaleContext.tsx`,
  Profile's Language row + `LanguageSheet` (cosmetic only, no catalog yet).
- Plan item 2, typed-API slice (earlier run): `utils/i18n.ts` (`Catalog`,
  `getCatalog`, `useStrings()`). No call sites touched that run.
- Plan item 2, call-site migration (earlier runs, runs 1-13): 54 files
  (`ScreenHeader.tsx`, `Sheet.tsx`, the `ResultsScreen`-tree batch, and 51
  leaves/screens through `app/(tabs)/categories.tsx`). Full detail in
  PLAN.md.
- Run 14, review feedback (owed from the run 9-13 orchestrator review,
  addressed before any new conversion this run):
  - `app/(tabs)/categories.tsx`: `confirmDeleteCategory`'s `useCallback`
    deps were missing `strings` (it reads
    `strings.toasts.deleteFailed`). Same class as the earlier
    `CheckInCard` fix: after a locale switch, the delete-failed toast
    would speak the previous language. Fixed.
  - `design/PATTERN_VOCABULARY.md`: added a `## Localization` section
    with the four module-scope conversion shapes (module-level array,
    module-level helper function, plain module-level const, exported
    fixture array), condensed from run 12/13's HANDOFF notes, plus the
    transitive-test-coverage caution and the useMemo/useCallback-deps
    rule. One commit.
- Run 14, new conversions (three files, all ordinary leaf-shaped, no
  module-scope pattern, leaf-checked before starting per the standing
  caution):
  - `app/(tabs)/insights.tsx`: 12 usages, all inside `InsightsScreen`'s
    body. The `segments` `useMemo` was missing `strings` from its deps
    (added). Both test files that render this screen
    (`insightsFirstScan`, `insightsPager`) already had `LocaleProvider`;
    no test file changes needed.
  - `app/category/[id].tsx`: 15 usages, all inside
    `CategoryDetailScreen`'s body (the module-level
    `accessibleIdentityColor` helper does not read `strings`). None of
    its `useMemo`/`useCallback` hooks read `strings`, so no deps changes
    needed. Its one test file (`categoryDetailScreen.test.tsx`) already
    had `LocaleProvider`; no test file changes needed.
  - `app/habit/[id].tsx`: three separate function components in one
    file, each converted independently: `HabitDetailScreen` (the
    screen), `HabitDetailBreaking` (a real child component defined in
    the same file, not module scope), and the exported
    `EditSkipValueSheet` (a standalone `Sheet.tsx` importer, already
    covered by that run's test-file sweep). `StatBlock` and the
    module-level `periodSkipCount` helper do not read `strings`, so
    neither needed the `Catalog`-parameter treatment. No
    `useMemo`/`useCallback` in the file reads `strings`. Its
    screen-level test (`habitDetailPaywallPlacement`) and the sheet's
    own leaf test (`editSkipValueSheet`) already had `LocaleProvider`;
    no test file changes needed.
  - All three converted in one commit each; `tsc --noEmit` clean and the
    full suite green (109/109, 1147/1147) after every commit.
- Run 15, standing rebase-risk fix (before any new conversion this run,
  no REVIEW FEEDBACK section was pending): `dockGeometry.test.tsx` and
  `emptyStateGeometry.test.tsx` landed on main after the last rebase and
  render already-converted `QuickLogRow`/`SpentList`/`LeakFinderTeaser`
  without `LocaleProvider` in their local `Providers` wrapper (same class
  of failure run 11's notes warned about). Added `LocaleProvider` to
  both, one commit.
- Run 15, new conversions (two files, both leaf-checked before starting,
  no module-scope pattern in either):
  - `components/today/HowItWorksSheet.tsx`: 4 usages, all inside the
    component body. Only imported by `app/(tabs)/index.tsx` (Today),
    mounted unconditionally behind its own `visible` prop, same
    blast-radius shape as `Sheet.tsx`'s lesson. The four Today test
    files (`door3BreakSheet`, `todaySpentKept`,
    `todayQuoteRibbonPlacement`, `door1FirstRun`) already had
    `LocaleProvider`; no test file changes needed.
  - `app/paywall.tsx`: 26 usages, all inside `PaywallScreen`'s own body.
    `plans` and `features` are plain consts recomputed every render
    (not `useMemo`), so no deps array to update. No test renders
    `PaywallScreen` itself: `habitDetailPaywallPlacement` and
    `resultsScreenPaywallPlacement` only assert `router.back`/push
    navigation to the `/paywall` route. No test file changes needed.
  - Both converted in one commit each; `tsc --noEmit` clean and the full
    suite green (112/112, 1166/1166) after every commit this run.
- Run 16, new conversion (one file, this run's whole bounded slice per
  the dedicated-run sizing the previous run's Next section called for):
  - `app/(tabs)/index.tsx` (Today): 34 usages. One module-scope shape,
    a fifth variant not seen before: `FIRST_RUN_RIBBON_LINES`, a
    module-level `Record<string, string>` (a keyed object, not an array)
    built from four `strings.today.*` values. Moved into a `useMemo`
    inside `TodayScreen` alongside the existing `styles` memo; both
    usage sites updated to the local `firstRunRibbonLines` name. Three
    `useMemo`/`useCallback` blocks were missing `strings` from their
    deps: `handleBreakSheetStart`, the `sections` useMemo, and
    `handleDismissHabit`; all three fixed. All four test files that
    render this screen (`door3BreakSheet`, `todaySpentKept`,
    `todayQuoteRibbonPlacement`, `door1FirstRun`) already had
    `LocaleProvider`; two more candidates checked and ruled out
    (`habitsSeedStartSameTick.test.tsx`, comment-only mention;
    `dynamicType.test.tsx`, reads the file as text, does not render it).
    No test file changes needed. One commit; `tsc --noEmit` clean, full
    suite green (112/112, 1166/1166) after one re-run past a known
    pre-existing flake (see Notes).

## Next

- 15 files still import the static `strings` catalog directly outside
  `__tests__/` (rerun `grep -rl "from '@/constants/strings'" app
  components contexts utils | grep -v __tests__` for the current list).
  No top-level screen remains unconverted.
- The leak-scan screen set (`BillsScreen.tsx`, `DeckScreen.tsx`,
  `GracefulFailure.tsx`, `IntakeScreen.tsx`, `PayoffScreen.tsx`,
  `PulseDayDetailSheet.tsx`, `ResultsScreen.tsx`, `ScopeScreen.tsx`,
  `useTrackLeak.tsx`) has not been individually leaf-checked yet; several
  of these are the screens themselves (unconditionally mounted, wide
  blast radius), not ordinary leaves, so budget more than one run's
  bounded slice for this set and check each file's actual mount
  conditions before estimating cost. This is now the largest remaining
  chunk of plan item 2's call-site migration.
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
  and no non-English catalog exists. 59 files (2 shared, 57 leaves/screens)
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
  `Sheet.tsx` needed. A file can hold more than one function component
  (`app/habit/[id].tsx` has three: the screen, a real child component,
  and an exported sheet); check each one's own body boundaries and give
  each its own `const strings = useStrings();`, not just the top-level
  export.
- Four module-scope shapes are now confirmed among files still importing
  static `strings`, costed differently, and written up in
  `design/PATTERN_VOCABULARY.md`'s Localization section as of run 14: a
  module-level *array* built from `strings.xxx` (fixed by moving into a
  `useMemo` in the component body); a module-level *helper function*
  that reads `strings` directly (fixed by adding a `strings: Catalog`
  parameter, threaded from `useStrings()` at every call site, including
  any OTHER module-level function that calls it, like
  `AddUpcomingSheet.tsx`'s `draftFromExpense`); a plain module-level
  `const` built from a single `strings.xxx` value (a one-line
  `useMemo`); and an **exported array used as a test fixture elsewhere**
  (`OnboardingCarousel.tsx`'s `BEATS`), fixed by extracting a
  `buildX(catalog)` function and keeping the export as `buildX(strings)`
  with the static import, so the fixture and any default-prop shape stay
  unchanged while the real render path calls `useStrings()`. Grep the
  candidate's own exports (not just its internals) before assuming a
  module-level array is purely private.
- Whenever a conversion touches a `useMemo`/`useCallback` body that reads
  `strings`, add `strings` to its dependency array in the same edit. Not
  every file needs this (`category/[id].tsx` and `habit/[id].tsx`, run
  14, had none), but check every enclosing `useMemo`/`useCallback` per
  file regardless; a plain `useCallback`/inline handler with no memo at
  all (most of `habit/[id].tsx`'s handlers) never has this problem in
  the first place, only a memoized value that closes over `strings`
  without listing it does.
- Standing rebase risk (from run 11's out-of-band CI fix): any new test
  file landing on main for an already-converted shared component
  (`ScreenHeader`, `Sheet`) will fail the same LocaleProvider-missing way
  until this branch rebases and picks it up. Re-run `tsc` + the full
  suite after every rebase, not just after this routine's own commits.
  Run 14's rebase was a no-op (branch was already current with
  `origin/main` at session start).
- Pre-existing flake, not this stream's bug: `door3BreakSheet.test.tsx`
  timed out once under full-suite load early in run 13 (before any code
  change that session), then passed standalone and on every full-suite
  re-run afterward. Did not recur in run 14 (three full-suite runs, all
  109/109). Recurred once in run 16 (after the Today conversion, which
  is the file this exact test suite covers), and passed clean on an
  immediate re-run with no code change in between, same as run 13; still
  reads as full-suite timing load, not a regression from `strings`/
  `useStrings()` work, but worth watching given it is now recurring on
  the same test file that exercises the file this run touched. If it
  fails a third time, re-run once before treating it as a real
  regression; if it then still fails, treat it as this stream's problem
  and investigate rather than re-running again.

## REVIEW FEEDBACK

None pending. Runs 9-13's feedback (categories.tsx deps fix, the
PATTERN_VOCABULARY.md entry) was addressed at the start of run 14; both
commits are on this branch (see Completed above).

Coordination notes carried forward from the run 9-13 review, still no
action needed until the next rebase:

- `components/money/SpentList.tsx` and
  `components/onboarding/OnboardingCarousel.tsx` are also modified on
  `routine/ipad` (the restored 600pt cap on `SpentList`'s
  `listContent` plus a testID; the beat/beatContent split on the
  carousel). Whichever branch rebases across the other's merge must
  keep both changes and re-verify the pair: the cap survives AND the
  `useStrings` conversion survives.
- `app/profile.tsx` is touched by all three routine branches (this
  branch's `useStrings` conversion, `ipad`'s cap, `core`'s share card
  row). Same keep-the-union rule when its turn comes.
- Merge order stays core-p3 first, ipad second, this branch rebasing
  after each.
