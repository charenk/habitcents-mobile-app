# Localization routine: handoff

## Status

In progress. Run 26: no REVIEW FEEDBACK was pending at session start.
Rebased onto origin/main (74 commits behind; branch had gone stale
since run 25 while main shipped a "log where you already are" feature
sweeping several files this stream had already converted). Two real
conflicts beyond mechanical import-line merges, both resolved by
keeping main's newer code and this branch's `useStrings()` line
together (detail in PLAN.md's run 26 entry under item 4). Full suite
caught one real post-rebase gap (`logInPlace.test.tsx`, new on main,
missing `LocaleProvider`), fixed before any new work per the standing
rule to re-run tsc + the full suite after every rebase. Then did plan
item 4's next slice (`addUpcoming`, 40 keys x 10 languages) plus item
3's matching sweep of it (see Completed). 160 of ~660 keys now
populated per language.

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
- Run 20, plan item 4 started (provisional machine translations):
  catalog overlay/merge infrastructure built in `utils/i18n.ts`
  (`LocaleOverlay` type, `mergeCatalog()`, memoized `getCatalog()`) and
  a 17-key proof-of-pattern slice (`common` minus `keep`, `sheets`,
  `tabs`, `screenTitles`) populated for all 10 target languages in a
  new `locales/` directory. `common.keep` deliberately withheld
  (near-locked-vocabulary, not this routine's call) and guarded by a
  new parameterized test file, `__tests__/localeCatalogs.test.ts`.
  Fixed a real test-isolation bug `languageSheet.test.tsx` had been
  carrying since run 10 (invisible until a real overlay existed to
  leak between test cases): added `AsyncStorage.clear()` between
  cases and updated the Cancel-button assertion to the live catalog
  value. Added the DECISIONS NEEDED proposal table for leak/skip/kept/
  slip (below), ahead of translating the sections that contain them.
  Full design rationale, the exact key list, and the suggested next
  slice are in PLAN.md's run 20 entry under item 4. Three commits (the
  infra/translation slice, the languageSheet fix, and the
  PATTERN_VOCABULARY.md fix below); `tsc --noEmit` clean, full suite
  green (113/113, 1210/1210, up from 112/1166), no flake.
- Run 20, review feedback (owed from the orchestrator's runs 17-19
  review, which landed on origin mid-run and was rebased onto before
  pushing): `design/PATTERN_VOCABULARY.md`'s Localization deps rule
  named only `useMemo`/`useCallback`; extended to also name
  `useEffect`, since runs 17-18 found the same stale-closure class in
  five screens' announce-on-mount effects. The review's item-4
  guidance (proceed with the plan's 10 languages, keep the locked
  terms and quotes provisional via the proposal table, head every
  catalog file with the required line, fold `daysUntilLabel` into
  item 4's new-keys work) needed no action this run: this run's design
  already matches it, and `daysUntilLabel` is noted as future new-keys
  work in PLAN.md's run 19 and 20 entries.
- Run 21, plan item 4's second slice: `expenses` (10 string keys),
  `categories` (13), `categoryDetail` (10), `profile` (3) populated
  across all 10 locale overlays, per run 20's suggested next-slice
  order. Every function-valued key in these four sections stayed
  omitted (inherits English), including the plain-interpolation ones
  that don't strictly need ICU/CLDR plural rules
  (`editAccessibilityLabel`, `deleteTitle`, `thisMonthSuffix`,
  `openCategoryLabel`, `vsLastMonth`, `recentLogsCount`,
  `logTimestamp`), kept consistent with the one genuinely pluralized
  function in scope (`categoryDetail.logCount`) rather than
  hand-picking which functions are "safe enough" ahead of item 2's
  real ICU pass. `upcoming` confirmed to have nothing translatable
  yet: both its keys are functions, and `recurringCount` is itself the
  ternary-plural case that ICU work is waiting on. Deliberately did
  not reach `settings` (the largest of the five suggested sections,
  ~28 string keys) this run, per the same "budget more than one run
  per chunk" guidance run 20 gave; it is next. One naming call worth a
  second look, not gated on Charen: `categories.deleteCancel` ("Keep
  category") was translated normally in every language rather than
  withheld like `common.keep`, since the full phrase's own object
  disambiguates it from the locked `kept` concept; reasoning and the
  exact translations are in PLAN.md's run 21 entry. Two
  draft-translation fixes caught before committing: a wrong Dutch
  preposition in `categoryDetail.trendEmpty`, and an overly colloquial
  first-draft zh-Hans `profile.title` ("我的") corrected to the more
  literal "个人资料" to match every other language's literal
  rendering. No test file changes needed (`localeCatalogs.test.ts` is
  schema-driven and already covers new overlay keys; no other test
  asserts literal English text for these sections' keys). One commit;
  `tsc --noEmit` clean and the full suite green (113/113, 1210/1210)
  after one re-run past the same pre-existing
  `door3BreakSheet.test.tsx` full-suite-load flake noted since run 13
  (passed standalone and on the immediate full-suite re-run with no
  code change; this run touched nothing in the Today tree).
- Run 22, plan item 4's third slice: `settings` minus
  `versionValue`/`supportEmail` (28 string keys) populated across all
  10 locale overlays, the section run 21 deliberately deferred as the
  largest of the originally suggested five. The three function-valued
  keys in this section (`currencyRowLabel`, `languageRowLabel`,
  `versionFooter`) stay omitted, same treatment as every other
  section. `upcoming` confirmed to still have nothing to add (both keys
  function-valued, unchanged since run 21). Fixed a live recurrence of
  the test-isolation class run 20 first found in
  `languageSheet.test.tsx`: two assertions (`'lists System default...'`,
  `'System default is selected...'`) read the static English
  `strings.settings.languageSystemDefault` while `LanguageSheet` itself
  renders under that file's French-mocked device locale; now that
  `settings.languageSystemDefault` has a real French translation, both
  switched to `getCatalog('fr').settings.languageSystemDefault`,
  matching the file's own established pattern from its `cancel`-button
  test. No other test file changes needed (`localeCatalogs.test.ts` is
  schema-driven and already covers new overlay keys). One commit;
  `tsc --noEmit` clean and the full suite green (113/113, 1210/1210) on
  the first run, no flake. Full detail, including the lesson about
  checking a translated section against any test's mocked device
  locale (not just a general grep), in PLAN.md's run 22 entry.
- Run 23, plan item 4's fourth slice: `addCategoryModal` (7 string
  keys) and `expenseSheet` minus the function-valued `amountLabel` (8
  string keys) populated across all 10 locale overlays. Both sections
  confirmed clean before starting: real, unconditionally-reachable call
  sites, no locked-vocabulary overlap, no test mocking a non-English
  device locale renders either component. `editExpenseModal` (right
  after `addCategoryModal` in `constants/strings.ts`) confirmed dead
  code, zero real imports anywhere, superseded by `expenseSheet`'s
  overlapping, newer key set; left untranslated, same treatment as the
  retired `ViewQuote` pair. `insights` scanned and confirmed gated
  (leak/skip references throughout, same class as `habitLogging`);
  `habitDetail`/`reports` skimmed with no locked-vocabulary hits found
  but not yet fully confirmed clean, candidates for a future run.
  `expenseSheet.saveExpense`/`saveChanges` (both "Save" in English,
  per the 2026-09-04 one-word drawer-feedback decision) translated
  using each language's established `common.save` word rather than a
  fresh "save expense" phrase, matching the English source's own
  wording; `logEyebrow`/`editEyebrow` deliberately used a verb distinct
  from each language's save verb where they would otherwise collide
  (French "Consigner" vs. "Enregistrer", German "erfassen" vs.
  "speichern"), keeping the sheet's two labels visibly different words
  the way they are in English. `addCategoryModal.editCategory` reused
  `categoryDetail.editCategoryLabel`'s already-established translation
  per language (same English text modulo the trailing sheet-title
  period), same reuse-over-redo approach run 21 used for
  `expenses.saveExpense`. No test file changes needed
  (`localeCatalogs.test.ts` is schema-driven). One commit; `tsc
  --noEmit` clean and the full suite green (113/113, 1210/1210) on the
  first run, no flake. Full detail in PLAN.md's run 23 entry.
- Run 24, review feedback (owed from the 2026-09-10 orchestrator's
  review of runs 20-23, which landed on origin mid-run and was rebased
  onto before pushing; addressed alongside this run's own translation
  work since fixing it required no reordering):
  - CJK punctuation stragglers: `ja.ts`'s `settings.startOverConfirmTitle`
    used a half-width "?" where `zh-Hans.ts` correctly used full-width
    "？"; a confirm-sheet question is a full sentence, not a
    `screenTitles`-style short label, so fixed ja to full-width "？"
    and corrected its header comment (the old note claiming half-width
    question marks were a deliberate title-style choice was wrong).
    `zh-Hans.ts`'s `categories.deleteMessage` had a stray ASCII comma
    mid-sentence ("保留,只是") next to its own full-width punctuation;
    fixed to full-width "，". Swept both files for any other ASCII
    punctuation inside a real sentence (rather than a short label) and
    found none. Recorded the settled policy (short-label ASCII vs.
    full-sentence native punctuation for ja/zh-Hans/hi; ko's terse
    noun+됨 vs. conversational -어요/-세요 register split) as its own
    bullet in `design/PATTERN_VOCABULARY.md`'s Localization section,
    per the review's ask for a durable, central record rather than only
    scattered per-file headers.
  - `DeepPartialCatalog`'s array branch type hole (`utils/i18n.ts`): an
    overlay array of objects (e.g. a future `TodayQuote[]` overlay for
    the retired `today.spentQuotes`/`keptQuotes`) typed its elements as
    deep-partial, so tsc would have accepted an element missing a
    required field like `text`, which `mergeCatalog`'s wholesale array
    replacement would then render as `undefined` at runtime with no
    type error to catch it. Added `WidenLiterals<T>`, the same
    literal-widening walk as `DeepPartialCatalog` but without the `?:`
    on object keys, and switched the array branch to use it: an overlay
    array element must now supply every field the base element type
    requires, matching how the field was already required to construct
    one directly, while still widening string-literal leaves to `string`
    like every other overlay value. Compile-time-only fix (no current
    overlay touches an object array; the hole was latent, not a live
    bug), verified via `tsc --noEmit` rather than a new runtime test.
  - One commit; `tsc --noEmit` clean and the full suite green
    (113/113, 1210/1210) on the first run after these fixes, no flake.
- Run 24, plan item 4's fifth slice: followed up on the two candidates
  run 23's skim left unconfirmed. `habitDetail` turned out almost
  entirely dead code: only `notFound` ("Habit not found") has a real
  render path (`app/habit/[id].tsx`); `perDay`, `perWeek`,
  `perMonthUnit`, `perUnit`, and `suggestions` have zero references
  anywhere outside `constants/strings.ts` (confirmed key by key).
  `reports` was the same story at larger scale: only `loading` and the
  function-valued `weekOf` are actually rendered
  (`app/(tabs)/insights.tsx`, `contexts/ReportsContext.tsx`); every
  other key (`title`, `subtitle`, `total`, `noSpendingData`,
  `noActiveHabits`, `projectedThisMonth`, the four `timeRange*` keys,
  and the function-valued `spent`/`daysLeft`) has no render path at
  all, confirmed via `find app -iname "*report*"` and `find components
  -iname "*report*"` turning up nothing: the old Reports tab this
  section was written for is gone, superseded by Insights, and nothing
  picked the strings back up. Translated the two live keys
  (`habitDetail.notFound` fresh per language, matching
  `categoryDetail.notFound`'s construction; `reports.loading` reused
  from `categories.loading`/`expenses.loading`, same English source).
  Left the ten dead keys untranslated, same treatment as
  `editExpenseModal` (run 23) and `ViewQuote` (run 19); worth deleting
  from `constants/strings.ts` someday as a separate code-cleanup call,
  outside this routine's mandate.

  With both flagged candidates mostly dead ends, picked `toasts` as
  this run's real slice: 22 of its keys are plain generic UI toasts
  with real call sites across 13 files, confirmed live one by one
  (`stoppedHistoryKept`/`leakDismissed` stay gated on locked
  vocabulary; `yesterdayNoted` confirmed dead the same way; every
  function-valued key stays omitted per the standing rule). Of those
  22, nine share one English value ("That did not save. Try again."),
  so only 14 distinct phrases needed real translation per language,
  reusing established verb roots from `expenseSheet.logEyebrow`,
  `common.save`/`delete`, `settings.restoreDoneMessage`, and
  `settings.startOverRow` wherever one already existed. Extended the
  short-label-vs-full-sentence punctuation split ja/zh-Hans/hi already
  carry (literal "." on short labels, native punctuation on real
  sentences) to this slice's failure toasts, and documented the rule
  explicitly in each of those three locale files' headers since this
  is the first slice with enough natural sentences to need it spelled
  out. `ko`'s short confirmations follow the terse noun+됨 toast
  convention Korean apps use for status notifications, also documented
  in its header. No test file changes needed
  (`localeCatalogs.test.ts` is schema-driven and covers new overlay
  keys automatically; only `languageSheet.test.tsx` mocks a non-English
  device locale anywhere in the repo, and it asserts nothing under
  `toasts`). One commit; `tsc --noEmit` clean and the full suite green
  (113/113, 1210/1210) after one re-run past the same pre-existing
  `door3BreakSheet.test.tsx` full-suite-load flake noted since run 13
  (timed out on the first run, no code change in the Today tree that
  test covers; passed clean on the immediate re-run). Full detail,
  including the exact list of reused verb roots and the paywall
  gating call, in PLAN.md's run 24 entry.
- Run 25, plan item 3's first sweep (the review's priority nudge, not
  acted on in run 24): swept every test file's literal-string
  assertions against the 14 sections item 4 has translated so far
  (common, sheets, tabs, screenTitles, expenses, categories,
  categoryDetail, profile, settings, addCategoryModal, expenseSheet,
  habitDetail.notFound, reports.loading, toasts). Method and
  classification rules (real coverage vs. a generic component's own
  contract test vs. fixture data sharing a section's key name) recorded
  in `design/PATTERN_VOCABULARY.md`'s Localization section. Found 8
  real strays, all in app-screen tests: `door3BreakSheet.test.tsx` (3),
  `todayQuoteRibbonPlacement.test.tsx` (1), `door1FirstRun.test.tsx`
  (2) asserted literal `'Close'` where `Sheet.tsx` reads
  `strings.common.close`, fixed to `strings.common.close` (all three
  files already imported `strings`); `profile.test.tsx` (2) asserted
  literal `'Currency'`/`'Version'` accessibility-label prefixes where
  `strings.settings.currency`/`version` are the real source, fixed to
  `settingsRowLabel(strings.settings.currency, 'USD')`/
  `settingsRowLabel(strings.settings.version, '1.0.0')` (both `strings`
  and `settingsRowLabel` were already imported there too, for the
  file's many other already-catalog-based assertions). Most of the
  sweep came back clean: item 2's call-site conversions were mostly
  already paired with catalog-based test updates as they landed, so the
  literal-English surface left to migrate was smaller than the
  checkbox's still-open state suggested. New item-6 finding surfaced
  along the way, not fixed this run (out of item 3's scope, no catalog
  key involved): `utils/a11y.ts`'s chip-label helpers
  (`selectableChipLabel`/`presetChipLabel`/`exactPriceChipLabel`)
  hardcode English "selected"/"not selected" directly in the template
  string in every locale; recorded in `design/PATTERN_VOCABULARY.md`.
  One commit; `tsc --noEmit` clean and the full suite green (113/113,
  1210/1210) on the first run, no flake. Full detail, including the
  exact grep method, in PLAN.md's run 25 entry.
- Run 26, rebase (74 commits behind origin/main, the first real rebase
  this stream has needed since run 15): two real conflicts, both
  resolved by keeping the union of main's newer code and this branch's
  `useStrings()` line.
  - `app/(tabs)/insights.tsx`: main added `const [logVisible,
    setLogVisible] = useState(false);` right where this branch's
    `useStrings()` line landed; kept both.
  - `app/(tabs)/index.tsx`: main's `handleBreakSheetStart` was
    refactored to extract its writes into a new
    `utils/useBreakHabitStart()` hook shared with Money, dropping the
    function's own try/catch/error-toast entirely; this branch's
    pre-rebase commit had only updated that now-obsolete try/catch to
    use `useStrings()`. Confirmed `utils/useBreakHabitStart.ts` already
    owns the same `strings.toasts.startHabitFailed` toast internally
    before discarding the obsolete block outright (kept main's version
    verbatim, no `strings` usage left in this function post-refactor).
  - Post-rebase, `npm install` (fresh container, no `node_modules`) then
    `tsc --noEmit` was clean but the full suite had one real failure:
    `logInPlace.test.tsx`, new on main this run, renders `MoneyScreen`/
    `InsightsScreen` (both pull in `ReportsProvider`, `useStrings()`-
    converted since run 19) without `LocaleProvider` in its local
    `Providers` wrapper. Same class of failure the standing rebase-risk
    note (below, since run 11) warns about; added `LocaleProvider`,
    following `emptyStateSurfaces.test.tsx`'s established wrapper
    ordering (inside `ThemeProvider`, ahead of `CurrencyProvider`).
    Confirmed via `npx jest __tests__/logInPlace.test.tsx` before
    re-running the full suite. One commit for both the rebase resolution
    and this fix (no separate translation work had landed yet to split
    it from).
- Run 26, plan item 4's sixth slice: `addUpcoming` (40 string keys;
  `everyNDaysValue`/`amountLabel` stay function-valued, deferred to item
  2's ICU work) populated across all 10 locale overlays. Confirmed clean
  first: no locked vocabulary, real render path via
  `components/money/AddUpcomingSheet.tsx` (already `useStrings()`-
  converted). Reused established per-language vocabulary throughout
  (the "Upcoming" noun from `expenses.upcoming`, the "expense" noun and
  edit/delete verbs from `expenseSheet`/`categoryDetail`, `common.save`
  for both `save` and `saveChanges`) rather than re-deriving it.
  `whenNextWeek`/`startingNextWeek` share one translation per language,
  matching the English source's own reuse of "Next week" in both
  places. Two judgment calls made and documented (not gated on Charen,
  neither touches locked vocabulary or pricing/legal copy): `onThe`
  reads as the field's own name ("date") in ja/ko/zh-Hans/hi, which have
  no natural standalone connector word for it; question-mark fields
  (`whatIsIt`, `when`, `onWhichDay`) take native "？" in ja/zh-Hans,
  extending the `startOverConfirmTitle` precedent from real dialogs to
  these field-prompt questions. Full reasoning, plus the one real
  mistake caught before committing (ja's `onWhichDay` first drafted as
  day-of-month "何日ですか？" before confirming in `AddUpcomingSheet.tsx`
  that it actually asks for a day of the WEEK; fixed to "何曜日ですか？"
  before zh-Hans, which used the unambiguous "星期几？" from the start),
  in PLAN.md's run 26 entry.
- Run 26, plan item 3's second sweep, scoped to `addUpcoming` (the
  section this same run translated for item 4): both real render-path
  test files (`addUpcomingSheet.test.tsx`, `moneyUpcomingTab.test.tsx`)
  already had `LocaleProvider` and assert at the default English locale
  with no non-English device-locale mock, so their existing
  `strings.addUpcoming.*` assertions already read the live catalog
  correctly. No fix needed.

  All three run-26 items landed as separate commits (rebase fix,
  translation slice, sweep confirmation needed no commit of its own);
  `tsc --noEmit` clean and the full suite green (115/115, 1215/1215) on
  the first run after the rebase fix, no flake.

## Next

Plan item 4 is underway (160 of ~660 keys populated across all 10
languages: `common` minus `keep`, `sheets`, `tabs`, `screenTitles` (run
20), plus `expenses`, `categories`, `categoryDetail`, `profile` (run
21), plus `settings` minus `versionValue`/`supportEmail` (run 22), plus
`addCategoryModal`, `expenseSheet` minus `amountLabel` (run 23), plus
`habitDetail.notFound`, `reports.loading`, and 22 of `toasts`' keys
(run 24), plus `addUpcoming` minus `everyNDaysValue`/`amountLabel` (run
26); see PLAN.md's run 20-24 and run 26 entries for the full design).
`upcoming` stays fully English until item 2's ICU/pluralization work
lands, since both its keys are function-valued. Budget more than one
run per meaningful chunk (10 languages x a section adds up fast), the
same lesson item 2's file-by-file conversion learned repeatedly and
runs 21-24 and 26 stayed within. `habitLogging`, `coachMoments`,
`insights`, `habitDetailV2`, and `today`'s quote arrays still need the
DECISIONS NEEDED table below settled (or at minimum provisional entries
adopted with a clear "pending Charen" marker) before translating, since
those sections contain the locked vocabulary (`insights` confirmed
gated run 23: `leaksTitle`, `skipValueSheetTitle`, and more;
`habitDetailV2` confirmed gated run 26 on a first skim: `skipValueSheetTitle`
uses "skip"/"keeps") and (for `today`) the RETIRED, out-of-scope quote
arrays. `paywall` needs a different kind of sign-off before this
routine touches it, not locked-vocabulary related: see DECISIONS NEEDED
below. `habitDetail` and `reports` are now fully resolved (each had
exactly one live key, both translated run 24; the rest is confirmed
dead code, left alone). `addUpcoming` is also now fully resolved. The
next slice needs another fresh pick: `onboarding`, `leakScan`, `today`
(largely gated), `money` (partially gated, contains
`habitsEmptyTitle`'s "leak" and the leak-counting functions), and
`insights` remain unchecked. `toasts` has two keys left once
`leakDismissed`/`stoppedHistoryKept` are settled (see DECISIONS
NEEDED).

What is actually left for a future run:
- Plan item 2's ICU/pluralization checkbox (function-valued strings
  like `n === 1 ? '' : 's'` ternaries becoming proper CLDR plural
  rules): deliberately deferred until item 4's real catalogs reach a
  function-valued key and show what the ICU formatting actually
  needs. `LocaleOverlay`'s design (run 20) already accommodates this:
  a function-valued key is supplied whole, with its own locale's
  plural handling, whenever that happens; no infra change needed to
  start, just the first real case.
- `utils/recurring.ts`'s `daysUntilLabel` export does not read the
  catalog at all (hardcoded English "Today"/"Tomorrow"/"in N days"),
  confirmed again in run 19. This is new-keys work (add translated keys
  and thread them in), not call-site migration; worth its own pick,
  maybe alongside item 4 since it needs new catalog entries either way.
- Plan item 3 (test migration away from literal-English assertions):
  run 25 swept the 14 sections item 4 has translated so far and fixed
  the 8 real strays it found (see Completed and PLAN.md's run 25
  entry); the checkbox stays open because this is not a standing
  guarantee for sections item 4 has not reached yet. Re-run the sweep
  method recorded in `design/PATTERN_VOCABULARY.md` against each newly-
  translated section as item 4 progresses, ideally in the same run that
  translates it (cheaper than a separate pass once the list of
  translated sections grows further).
- Plan item 6 (localized a11y labels) has a concrete first target now,
  found during run 25's sweep: `utils/a11y.ts`'s
  `selectableChipLabel`/`presetChipLabel`/`exactPriceChipLabel` helpers
  hardcode English "selected"/"not selected" in the template string
  itself, with no catalog key at all, so every chip's accessibility
  label ends in literal English regardless of the picked language.
  Needs two new `common` keys (`selected`/`notSelected`) threaded into
  all three helpers when item 6's turn comes.
- Plan items 5 (overflow hardening) and 6 (localized a11y labels)
  otherwise stay sequenced after item 4, as scoped.

## Blockers

None.

## DECISIONS NEEDED

**New this run: `paywall` needs a go-ahead before this routine
translates it, separate from the locked-vocabulary gate below.** It has
no leak/skip/kept/slip content, but it is pricing and trial-terms copy:
plan pricing (`$29.99`/`$3.99`/`$49.99`), the trial length and
cancellation line ("Start with a 14-day free trial. Cancel anytime
before it ends."), and the "nothing is charged yet" disclaimer. Ops
CLAUDE.md's PR-flow rule names "pricing, payments, legal wording" as
needing Charen's explicit go before a session acts on them; a
provisional machine translation of a free-trial disclosure into 10
languages reads as exactly that, not as ordinary UI copy this routine's
existing charter already covers. Options: (a) treat it like the locked
vocabulary below, translate once Charen either signs off on this
routine handling it or reviews the translations before they ship
active; (b) hold it for human/professional translation given the
legal exposure; (c) something else Charen prefers. No action taken
either way this run; flagging so it doesn't get translated by a future
run without a decision here first.

Proposal table for the four locked vocabulary terms (leak, skip, kept,
slip; ops CLAUDE.md), added run 20 ahead of translating the sections
that contain them (`habitLogging` above all). **Every entry below is a
provisional, machine-assisted candidate. None are finalized. This
routine will not translate `habitLogging`, `coachMoments`, or any other
section using these terms until Charen picks (or explicitly defers)
per language**, per the plan's standing rule.

Rationale shorthand used below: "leak metaphor" = the target language
has an established or natural money-leak idiom; "kept ≠ saved" = chose
a retain/keep verb over a save/economize verb, since the product
vocabulary deliberately distinguishes "kept" (money not spent, a
side effect of skipping) from "saved" (a deliberate act), and a
save-verb translation would blur that; "neutral, no-blame" = chose a
lapse/slip word that reads as neutral or clinical rather than as
failure, matching "slip records what happened, it never takes
anything back" (constants/strings.ts's own comment on the concept).

**leak** (noun, a detected spending pattern; e.g. "Leaks found")

| Language | Proposed | Rationale |
|---|---|---|
| es | fuga | leak metaphor ("fuga de dinero" is idiomatic) |
| fr | fuite | leak metaphor, direct |
| de | Leck | leak metaphor, direct (also seen as "Geldleck") |
| pt-BR | vazamento | leak metaphor ("vazamento de dinheiro" is idiomatic) |
| it | perdita | leak/loss metaphor ("perdita di denaro") |
| ja | 漏れ | leak metaphor ("支出の漏れ" is a real phrase) |
| ko | 누수 | leak metaphor ("돈 누수" is idiomatic) |
| zh-Hans | 漏洞 | leak/gap metaphor; alternative "漏财" is more finance-idiomatic, worth Charen's pick between the two |
| hi | रिसाव | leak metaphor ("पैसों का रिसाव" is used) |
| nl | lek | leak metaphor, direct ("geldlek" is idiomatic) |

**skip** (verb/label; "Skip it", "I skipped one", "Skipped it +$X")

| Language | Proposed | Rationale |
|---|---|---|
| es | saltar / me lo salté | direct, common verb for skipping an action |
| fr | sauter / je l'ai sauté | direct |
| de | überspringen / übersprungen | direct |
| pt-BR | pular / pulei essa | direct, informal register matches the app's voice |
| it | saltare / saltato | direct |
| ja | スキップ(した) | loanword, widely understood in Japanese app UI |
| ko | 건너뛰기 / 건너뛰었어요 | direct, standard UI term for "skip" |
| zh-Hans | 跳过 | direct, standard UI term |
| hi | छोड़ा / छोड़ें | direct, "left out / skip" |
| nl | overslaan / overgeslagen | direct |

**kept** (past participle; "Kept so far", "money you didn't spend")

| Language | Proposed | Rationale |
|---|---|---|
| es | conservado | kept ≠ saved (not "ahorrado") |
| fr | conservé | kept ≠ saved (not "économisé") |
| de | behalten | kept ≠ saved (not "gespart") |
| pt-BR | mantido | kept ≠ saved (not "economizado") |
| it | conservato | kept ≠ saved (not "risparmiato") |
| ja | キープ | loanword, neutral; avoids "節約" (saved/economized), kept ≠ saved |
| ko | 지킨 | kept/protected; avoids "절약" (saved), kept ≠ saved |
| zh-Hans | 留住 | kept/retained; avoids "省下" (saved), kept ≠ saved |
| hi | रखा | kept/retained; avoids "बचाया" (saved), kept ≠ saved |
| nl | behouden | kept ≠ saved (not "bespaard") |

**slip** (noun; "A slip records what happened, it never takes anything back")

| Language | Proposed | Rationale |
|---|---|---|
| es | desliz | neutral, no-blame; common word for a minor lapse |
| fr | écart | neutral, no-blame; "deviation" reads clinical, not judgmental |
| de | Ausrutscher | neutral, informal, no-blame |
| pt-BR | deslize | neutral, no-blame |
| it | scivolone | neutral, informal, no-blame |
| ja | スリップ | loanword; already used this way in Japanese habit/recovery apps, neutral |
| ko | 슬립 | loanword; avoids "실수" (mistake), which reads as blame |
| zh-Hans | 失误 | closest neutral term available; reads slightly more negative than the English "slip", flagged for Charen's judgment; alternative "小差错" is softer |
| hi | चूक | neutral, common word for a lapse without heavy judgment |
| nl | misstap | neutral, no-blame |

The app's quotes (`today.spentQuotes`/`today.keptQuotes`) are
deliberately NOT proposed here: both arrays are RETIRED dead code (ADR
0037; nothing renders them since `ViewQuote.tsx`'s run-19 removal from
the live tree), so translating them has no observable effect. Revisit
only if ADR 0037 is reversed and the quote rotation un-retires.

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
- The Language picker in Settings is no longer purely cosmetic: as of run
  20, selecting a language changes visible text for any already-
  `useStrings()`-converted component that reads `common` (minus `keep`),
  `sheets`, `tabs`, or `screenTitles` (every call site is converted, per
  item 2's run-19 close-out). Everything else still resolves to English,
  since no other section has a translated overlay yet. When picking a
  test-file candidate for anything touching those four sections, a test
  asserting literal English text for them (rather than reading the live
  catalog) can now genuinely fail for a locale with a real overlay, not
  just theoretically; see `languageSheet.test.tsx`'s run-20 fix for the
  pattern (also: clear `AsyncStorage` between test cases that call
  `setOverride()`, so one case's override does not leak into the next).
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
  intermittent full-suite timing load, not a regression. Recurred once
  more in run 24 (timed out on the first full-suite run, no code change
  in the Today tree; passed clean on the immediate re-run), consistent
  with every prior occurrence; still reads as full-suite timing load.
- Dead code is a real possibility for any section a first pass clears of
  locked vocabulary, not just a formality: run 24 checked run 23's two
  flagged candidates (`habitDetail`, `reports`) key by key
  (`grep -rn` for each key name individually, not a whole-section grep)
  and found both were almost entirely unreferenced outside
  `constants/strings.ts` itself, `reports` because the screen it was
  written for (the old Reports tab CLAUDE.md still describes) no longer
  exists, superseded by Insights. Before translating a "clean" section,
  confirm every key actually has a render path, the same rigor already
  applied to ruling out `editExpenseModal`/`ViewQuote`; a section being
  small is not evidence it's all live.
- Pricing/trial/legal copy is a second gate distinct from the locked
  vocabulary, discovered this run: `paywall` has no leak/skip/kept/slip
  content but is pricing and trial-terms copy (ops CLAUDE.md's PR-flow
  human gate names "pricing, payments, legal wording" as needing
  Charen's go). Check any newly-picked section for this before assuming
  "no locked vocabulary" means "safe to translate"; see this run's
  DECISIONS NEEDED entry for the reasoning and the options put to
  Charen. A plain confirmation toast that merely mentions a trial
  starting (no price, no legal disclosure) is not the same thing;
  `toasts.trialStarted` was translated this run on that basis.
- The short-label-vs-full-sentence punctuation split (literal "." on
  short/title-style strings, native sentence punctuation on genuine
  multi-clause sentences) already existed in ja/zh-Hans (native "。")
  and hi (native "।") since run 20's `screenTitles` note and run 21's
  full-sentence translations, but was never spelled out as an explicit
  rule until run 24's `toasts` slice needed it applied consistently
  across many new sentences at once. Now documented in each of those
  three locale files' own header comments; read that header before
  guessing which style a new sentence in those languages should use.
  `ko` doesn't need the split (no native/ASCII period distinction), but
  has its own register split worth checking: terse noun+됨 for short
  status toasts vs. the conversational -어요/-세요 register for longer
  sentences, also documented in its header now.

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

2026-09-09, orchestrator, runs 17-19 reviewed (through 2184217).
**Approved, one small docs fix owed.** The leak-scan set (runs 17-18)
and the three non-hook threadings (run 19) were spot-verified: the
Catalog-parameter shape in recurring.ts/coachMoments.ts matches the
PATTERN_VOCABULARY.md entry, ReportsContext's plain useStrings()
conversion is right (it does sit under LocaleProvider in _layout.tsx),
and the "exactly 4 files still import the static catalog, all by
design" claim was re-derived independently by grep and matches.
Independent verification on this branch's tip in a fresh container:
npm ci, tsc clean, and the four touched suites (recurrenceRule,
coachMoments, billsScreen, upcomingList) green, 114/114. The run 19
ViewQuote decision (retired pair stays unconverted) is endorsed: dead
code with no render path has no observable i18n effect, and the plan
records the revert-path condition for converting it later.

Fix owed (small, docs only):

- `design/PATTERN_VOCABULARY.md`'s Localization deps rule names only
  `useMemo`/`useCallback`, but runs 17-18 found the same stale-closure
  class in announce-on-mount `useEffect`s (five screens needed
  `strings` added to an effect's deps). Extend that bullet to cover
  `useEffect` so the next conversion or review doesn't rediscover it.

Guidance for item 4 (not a fix):

- Proceed with the plan's 10 listed languages; decision 5 on the
  status board stays open as a confirm-or-redirect for Charen, and
  provisional machine translations are cheap to regenerate if the set
  changes. Keep leak/skip/kept/slip and the quotes provisional with
  the proposal table, exactly as planned. Head every catalog file with
  the "Provisional machine translation, needs human review." line.
- Fold `daysUntilLabel`'s hardcoded "Today"/"Tomorrow"/"in N days"
  into item 4's new-keys work so the one flagged gap closes in the
  same pass that creates keys anyway.

Coordination update at the next `routine/ipad` crossing:

- `__tests__/billsScreen.test.tsx` is now modified on BOTH branches
  (this branch added LocaleProvider in run 18; ipad's run 14 added the
  footer-cap case), so it upgrades from "will need LocaleProvider" to
  a guaranteed textual conflict: keep the union (cap case AND the
  LocaleProvider wrapper). scopeScreen/payoffScreen tests already
  carry LocaleProvider here, so ipad's added cases there should merge
  clean; `paywallTabletCap.test.tsx` (ipad only) still needs
  LocaleProvider added when the branches cross.

2026-09-10, orchestrator, runs 20-23 reviewed (through b5654ac).
**Approved, no blockers; two small fixes owed.** Independently verified
on a fresh container: npm ci, tsc clean, and the four touched suites
green (i18n, localeCatalogs, languageSheet, billsScreen; 61 tests). The
overlay/merge design is right (deep-partial with English fallback,
wholesale function/array replacement, per-locale memoization), the
localeCatalogs guard suite covers exactly the three failure modes that
matter (schema drift, locked vocab, section completeness), and the
languageSheet test-isolation fix was a real pre-existing bug well
diagnosed. The leak/skip/kept/slip proposal table is properly
decision-shaped and is now surfaced on the status board (issue #139)
for Charen. Your PATTERN_VOCABULARY useEffect fix from the last review
is confirmed landed (4f139ea). ADR 0041 (ops PR #42) has been amended
to record the overlay mechanism; nothing for you to do there.

Fixes owed, both small, next run:

- **CJK punctuation consistency.** zh-Hans body copy correctly uses
  full-width punctuation, but stragglers remain: ja
  `settings.startOverConfirmTitle` ends in ASCII '?' where zh-Hans got
  full-width; ja and zh-Hans `categories.loading` end body copy with
  ASCII '.'; zh-Hans `categories.deleteMessage` uses an ASCII comma
  mid-sentence. Decide the policy explicitly (the ASCII '.' on the
  serif screen titles reads as a deliberate brand mark and may stay if
  you so choose), record it in the locale file headers or
  PATTERN_VOCABULARY's Localization section, and sweep ja/zh-Hans for
  conformance so later slices inherit a settled rule.
- **`DeepPartialCatalog`'s array branch is a latent type hole.** It
  types elements as deep-partial (`DeepPartialCatalog<U>[]`) while
  `mergeCatalog` replaces arrays wholesale, so for object-element
  arrays (`today.spentQuotes`/`keptQuotes`, `TodayQuote[]`) an overlay
  could legally supply elements missing `text` and tsc would accept a
  catalog that renders undefined at runtime. Retired content today, so
  latent, but tighten it before any live object array appears: array
  elements should be widened yet complete (required keys), not partial.

Priority nudge, endorsing your own run 22 note: do plan item 3 (the
literal-English test assertions) before the translated surface grows
much further. languageSheet.test.tsx going live in runs 20 and 22 shows
the class arriving one file at a time; a sweep now is cheaper than
chasing each recurrence.
