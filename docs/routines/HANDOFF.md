# Localization routine: handoff

## Status

In progress. Run 19: no REVIEW FEEDBACK was pending at session start
(only the two `routine/ipad` coordination notes carried forward from
runs 14-16, still not actionable until that branch's commits land on
main), branch was already current with origin/main (rebase was a
no-op). Converted the three genuine remaining-work files flagged since
run 11 and budgeted for a dedicated run by run 18:
`utils/recurring.ts`, `utils/coachMoments.ts`,
`contexts/ReportsContext.tsx`. **Plan item 2's call-site migration
checkbox is now checked.** Only 3 files still import the static
catalog, all previously flagged as by-design non-standard:
`utils/i18n.ts` (the seam), `OnboardingCarousel.tsx` (intentional
fixture builder), and the RETIRED `ViewQuote`/`useViewQuote` pair,
which this run made an explicit decision to leave unconverted (ADR
0037, dead code, no observable i18n effect; see PLAN.md's run 19
entry for the full reasoning). Plan item 2's remaining open work is
now only the ICU/pluralization checkbox (deferred to when item 4's
real catalogs show what it needs, per the plan's own note) and item 3
(test migration).

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
- Run 17, leak-scan screen set, 7 of 9 files (leaf-checked before
  starting per the standing caution; none had a module-scope shape):
  - `useTrackLeak.tsx`: a hook, not a component (name starts `use`,
    called unconditionally from `DeckScreen.tsx` and
    `ResultsScreen.tsx`, both already `LocaleProvider`-covered). Called
    `useStrings()` directly at its top level, same as
    `useCheckInFeedback.ts` (run 9). Added `strings` to both
    `trackLeak`'s and `startBreaking`'s `useCallback` deps (each reads
    one `strings.*` toast message on an error/already-breaking path).
  - `PulseDayDetailSheet.tsx`: ordinary leaf, mounted unconditionally
    inside `ResultsScreen.tsx` (already covered). Its `if (!cell) return
    null` early return sits after the hook calls, so `useStrings()`
    slots in alongside `useTheme()`/`useCurrency()` with no reordering
    needed. Its module-level `formatCellDate` helper only date-parses,
    does not read `strings`.
  - `PayoffScreen.tsx`, `GracefulFailure.tsx`, `DeckScreen.tsx`,
    `IntakeScreen.tsx`, `ScopeScreen.tsx`: five ordinary screen leaves.
    Four of the five carry the flow's standing "announce on mount"
    `useEffect` (`AccessibilityInfo.announceForAccessibility`) reading
    `strings` directly with a `[]` or partial deps array; added
    `strings` to each (a new variant of the standing useMemo/useCallback
    deps rule, applied to `useEffect` this time).
    `PayoffScreen.tsx`'s own effect already depended on a derived
    `evidence` value that recomputes from `strings` every render, so no
    deps change was needed there.
  - Test coverage: `deckScreen.test.tsx`, `payoffScreen.test.tsx`,
    `scopeScreen.test.tsx` already had `LocaleProvider`.
    `useTrackLeak`/`PulseDayDetailSheet` have no leaf tests of their
    own; both inherit `DeckScreen`'s and `ResultsScreen`'s coverage
    (`deckScreen`, `resultsScreenActivation`, `resultsScreenUndo`,
    `resultsScreenLadder`, `resultsScreenPaywallPlacement`,
    `leakScanImportUndo`, `leakScanOnboardingExit`), all already
    `LocaleProvider`-covered from the `ScreenHeader.tsx`/`Sheet.tsx`
    runs. `IntakeScreen.tsx` still has no dedicated leaf test (confirmed
    again); its only real render path is `leakScanOnboardingExit.test.tsx`
    via `LeakScanRoute`, already covered. `GracefulFailure`'s only
    near-hit, `useCompleteScanOnboarding.test.tsx`, is a doc-comment
    cross-reference and a stand-in probe component, not a real render
    (confirmed before ruling it out); its real coverage is the same
    `leakScanOnboardingExit` path. No test file changes needed for any
    of the seven files. Two commits (hook + small-screen batch, then
    Intake/Scope); `tsc --noEmit` clean and the full suite green
    (112/112, 1166/1166) after each, no flake either time.
- Run 18, `ResultsScreen.tsx` and `BillsScreen.tsx`, completing the
  leak-scan screen set (9 of 9 files):
  - `ResultsScreen.tsx`: module-level helper function
    `evidenceWindowLabel` took an added `strings: Catalog` parameter,
    threaded from `useStrings()` at its one call site (the
    `evidenceWindow` `useMemo`, `strings` added to its deps). Three
    `useCallback`s were missing `strings` from their deps and got it
    added: `handleSaveProjection`, `handleUndo`, `handleBringInDays`
    (each reads a `strings.toasts.*`/`strings.leakScan.*` value on an
    error or confirmation path). The announce-on-mount `useEffect`
    (`strings.leakScan.resultsTitle`) got `strings` added to its `[]`
    deps, same as run 17's leak-scan screens. The `HabitCardItem`
    memo'd child component does not itself read `strings`, so needed
    no change. All six of its test files
    (`resultsScreenActivation`/`resultsScreenUndo`/`resultsScreenLadder`/
    `resultsScreenPaywallPlacement`/`leakScanImportUndo`/
    `leakScanOnboardingExit`) already had `LocaleProvider`.
  - `BillsScreen.tsx`: module-level helper function `cadenceLabel` took
    the same added-parameter treatment, threaded from `useStrings()` at
    its two call sites, both inside `renderRow` (a plain function
    defined in the component body, not module scope, so it closes over
    `strings` fresh every render with no deps array of its own to fix).
    The announce-on-mount `useEffect` (`strings.leakScan.billsTitle`)
    got `strings` added to its `[]` deps. Its own dedicated leaf test,
    `billsScreen.test.tsx`, had no `LocaleProvider` at all (confirmed:
    it renders `BillsScreen` directly with no other provider tree
    reaching it); added it.
  - One commit; `tsc --noEmit` clean, full suite green (112/112,
    1166/1166), no flake. 68 of ~75 call-site files converted total.
    Confirmed via the standing grep that exactly 7 files remain, all
    previously-flagged non-standard cases (see Next); no top-level
    screen and no leak-scan file remains unconverted.
- Run 19, the three genuine remaining-work files, closing plan item 2's
  call-site migration checkbox:
  - `utils/recurring.ts`: `SCHEDULE_SEPARATOR` (a module-level plain
    const) folded into a local `separator` variable inside
    `describeSchedule` once that function itself takes `strings:
    Catalog`; `weekdayPlural`/`monthDayLabel` (module-level helper
    functions) got the same added-parameter treatment. One real call
    site, `components/money/UpcomingList.tsx:233`, already had
    `strings` in scope from its own run-12 conversion; updated to pass
    it through. `daysUntilLabel` (the other export in this file) still
    does not read the catalog at all, confirmed again; left alone, it
    is new-keys work, not call-site migration, out of this item's
    scope (same gap flagged run 18, now flagged a third time so it
    does not get lost). `__tests__/recurrenceRule.test.ts` calls
    `describeSchedule` directly as a pure function (not through a
    render), a shape not seen yet in this stream: imported the static
    English `strings` and passed it at all 20 call sites, since a
    plain unit test has no LocaleProvider tree to add.
    `__tests__/recurring.test.ts` (the separate byte-identical-dates
    pin) does not call it, no change needed there.
  - `utils/coachMoments.ts`: one module-level helper function,
    `cardText` (PLAN.md's run-18 note called it `resolveCoachCard`,
    a stale name now corrected), took the same added-parameter
    treatment. Three real call sites, all already `useStrings()`-
    converted with `strings` in scope: `CheckInCard.tsx` (inside a
    `useMemo` whose deps already listed `strings` from an earlier
    run), `LeakCard.tsx` and `app/(tabs)/index.tsx` (both plain
    render-body calls). `__tests__/coachMoments.test.ts` calls
    `cardText` directly too, same fix as `describeSchedule`'s test:
    static `strings` import, passed at both of its two call sites.
  - `contexts/ReportsContext.tsx`: turned out to be a plain
    `useStrings()`-eligible component conversion, not a threading
    problem, once traced: its one usage sits inside
    `calculateSpendingOverTime`, a `useCallback` in the
    `ReportsProvider` function component's own body, and
    `ReportsProvider` sits under `LocaleProvider` in
    `app/_layout.tsx`'s tree (confirmed before assuming so, per the
    open question run 18 left). Added `const strings = useStrings();`
    at the top of the provider and `strings` to that one useCallback's
    previously-empty deps array. Its only coverage is transitive
    through `insightsFirstScan.test.tsx`/`insightsPager.test.tsx`
    (render `ReportsProvider` via `app/(tabs)/insights.tsx`), both
    already `LocaleProvider`-covered from run 14; confirmed via
    `grep -rl "ReportsProvider"` that no other test file renders it.
    No test file changes needed.
  - Decision made this run, closing the one open question run 18 left:
    `components/today/ViewQuote.tsx` and `useViewQuote.ts` (RETIRED,
    ADR 0037, nothing renders them, kept only as a documented revert
    path) stay unconverted. Every remaining reference outside their
    own two files is a doc-comment cross-reference
    (`LongArc.tsx`, `constants/strings.ts`, `app/(tabs)/index.tsx`,
    `utils/storage.ts`), confirmed via `grep -rn`, never a real
    import. Dead code with no live render path has no observable i18n
    effect in any locale, so this reads as out of scope for a "full
    internationalization of the app a user experiences" plan, the
    alternative the run-11/18 notes already offered. If ADR 0037 ever
    un-retires the quote rotation, convert both then (a real hook plus
    a small leaf, no unusual shape).
  - Three commits (one per file); `tsc --noEmit` clean and the full
    suite green (112/112, 1166/1166) after every commit, no flake.
    Only 3 files now import the static catalog, all by design:
    `utils/i18n.ts` (the seam), `OnboardingCarousel.tsx` (the `BEATS`
    fixture builder), and the RETIRED `ViewQuote`/`useViewQuote` pair.

## Next

Plan item 2's call-site migration checkbox is now checked. Only 3 files
import the static `strings` catalog directly outside `__tests__/`
(rerun `grep -rl "from '@/constants/strings'" app components contexts
utils | grep -v __tests__` to confirm), all by design, none of them
future work for this item:
- `utils/i18n.ts` itself imports `strings` to derive `Catalog` and
  build `getCatalog()`; this is the seam, not something to convert.
- `components/onboarding/OnboardingCarousel.tsx` will always appear on
  this grep by design (run 12): its static import builds the exported
  `BEATS` test fixture; real rendering is already converted.
- `components/today/ViewQuote.tsx` and `useViewQuote.ts` are RETIRED
  (ADR 0037, nothing renders them any more) and, as of run 19's
  decision, deliberately staying unconverted: dead code with no live
  render path has no observable i18n effect. If ADR 0037 ever
  un-retires the quote rotation, convert both then.

What is actually left for a future run:
- Plan item 2's ICU/pluralization checkbox (function-valued strings
  like `n === 1 ? '' : 's'` ternaries becoming proper CLDR plural
  rules): deliberately deferred until item 4 lands real non-English
  catalogs and shows what the ICU formatting actually needs, per the
  plan's own note. Not blocked, just sequenced after item 4.
- `utils/recurring.ts`'s `daysUntilLabel` export does not read the
  catalog at all (hardcoded English "Today"/"Tomorrow"/"in N days"),
  confirmed again this run. This is new-keys work (add translated keys
  and thread them in), not call-site migration, so it was correctly
  out of scope for item 2's checkbox; worth its own pick, maybe
  alongside item 4 since it needs new catalog entries either way.
- Plan item 3 (test migration away from literal-English assertions):
  now unblocked in the sense that a large majority of files are
  migrated, but not yet started. Good candidate for the next dedicated
  run, or once item 4's first non-English catalog exists (whichever
  makes the migrated assertions more obviously worth writing).
- Plan item 4 (provisional machine translations, 10 languages): the
  next big chunk of net-new work. No catalog exists yet for any
  non-English locale; `getCatalog()` in `utils/i18n.ts` resolves every
  locale to English until this lands. Needs its own DECISIONS NEEDED
  proposal table for leak/skip/kept/slip and the app's quotes before
  finalizing (see that section below), but the other ~640 keys can
  proceed without waiting on Charen's picks for those four.
- Plan items 5 (overflow hardening) and 6 (localized a11y labels) stay
  sequenced after item 4, as scoped.

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
  and investigate rather than re-running again. Did not recur in run 17
  or run 18 (both clean on the first full-suite pass); still just
  intermittent full-suite timing load, not a regression.

## REVIEW FEEDBACK

2026-09-08, orchestrator, runs 14-16 reviewed (through 198d090; run 16
pushed while this review was running and was included). **Approved, no
code fixes owed.** The categories.tsx deps fix and the
PATTERN_VOCABULARY.md Localization section close everything owed from
runs 9-13. The run 15 rebase resolution was independently verified by
diffing this branch against main for QuickLogRow.tsx, SpentList.tsx and
money.tsx: only the useStrings() deltas remain, main's DockCard
redesign is intact, and the segments useMemo picked up `[strings]`. Run
16's Today conversion is the textbook version of the module-scope
pattern (the keyed-object variant into useMemo, three deps arrays
fixed); good catch ruling out the two false-positive test candidates.

One new coordination item, action at the next crossing with
`routine/ipad`, not now:

- `routine/ipad` run 14 added `__tests__/paywallTabletCap.test.tsx`,
  which renders `app/paywall.tsx` WITHOUT LocaleProvider (correct on
  that branch, where the screen still reads the static catalog). Your
  run 15 converted paywall.tsx to `useStrings()`, and `useLocale()`
  throws without a provider, so whichever branch rebases across the
  other inherits a failing test. The fix is your standing sweep's usual
  one: add LocaleProvider to that file's wrapper. The same will hold
  for `scopeScreen.test.tsx`, `billsScreen.test.tsx` and
  `payoffScreen.test.tsx` when the leak-scan screen set converts:
  ipad's run 14 added cap assertions to all three, none of which mount
  LocaleProvider yet.

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
