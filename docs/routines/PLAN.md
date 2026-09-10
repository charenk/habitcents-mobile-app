# Localization plan (routine/localization)

Full internationalization of the mobile app for 10 languages, on one
long-lived branch. Each run does one bounded increment (roughly one to two
hours), checks a box or two below, and stops cleanly. See
docs/routines/HANDOFF.md for live status.

Target languages (this batch, no RTL): es, fr, de, pt-BR, it, ja, ko,
zh-Hans, hi, nl. Base language: en.

Store metadata and screenshots are OUT of scope for this routine (human
work, tracked elsewhere).

## 1. Foundation: device locale + language override

- [x] Add `expo-localization` (installed at the SDK-54 bundled version,
      ~17.0.9). `i18n-js` (or an equivalent ICU formatter) is deferred to
      item 2, added when the catalog loader actually needs it, so no
      dependency sits unused in the meantime.
- [x] `utils/locale.ts`: `LocaleCode` union (en + the 10 targets),
      `LOCALES` metadata table (English name + native name, for the picker
      only, not app-string translation), `DEFAULT_LOCALE`, `isLocaleCode`,
      a pure `matchDeviceLocale()` matcher (unit-testable without mocking
      the native module) and a thin `detectDeviceLocale()` wrapper over
      `expo-localization`'s `getLocales()`. zh-Hant and non-BR pt fall back
      to `en` (out of scope this batch) rather than mismatching to the
      wrong catalog.
- [x] `utils/storage.ts`: `getLocaleOverride` / `setLocaleOverride`
      (`@habitcents_locale_override`; `null` means "follow device").
- [x] `contexts/LocaleContext.tsx`: mirrors `CurrencyContext` (load
      persisted override on mount, `locale` resolves to
      `override ?? detectDeviceLocale()`, rollback on a failed write).
      Wired into `app/_layout.tsx`.
- [x] Settings: a Language row on Profile opens `LanguageSheet` (mirrors
      `CurrencySheet`), listing System default + the 11 locales, native
      name first. Selecting a language only sets the override for now; it
      does not yet change any on-screen text, because no catalog exists
      until item 4. Comment left in the sheet noting this so it is not
      mistaken for a finished feature.
- [x] Tests: `utils/locale.ts` matcher, storage getter/setter, a rendered
      `LanguageSheet` test mirroring `currencySheet.test.tsx`.

## 2. Typed strings API + catalog conversion (~640 keys)

- [x] Design the typed API: `utils/i18n.ts` adds `Catalog` (`typeof strings`,
      so every section including function-valued ones stays in sync with no
      hand-duplicated type), `getCatalog(locale)` (the seam item 4 fills
      with real catalogs; every locale resolves to English for now, same
      catalog object) and `useStrings()` (reads `useLocale()`, mirrors
      `useCurrency()`). `constants/strings.ts` is unchanged (still the
      English catalog, still exported as `strings`), so this is additive:
      no call site was touched, no behavior changed. Tests:
      `__tests__/i18n.test.tsx` (getCatalog, useStrings throws outside
      LocaleProvider same as useLocale, resolves and re-resolves on locale
      change).
- [x] Call-site migration, file by file: replace
      `import { strings } from '@/constants/strings'` with
      `const strings = useStrings();` inside the component (same local
      name, so the rest of the file is unchanged). This requires
      `LocaleProvider` in that file's test render tree, same as
      `CurrencyProvider` did for currency, so **before** converting a
      shared/foundational component (`components/ui/Sheet.tsx`,
      `components/ui/ScreenHeader.tsx`), add `LocaleProvider` to every test
      file that renders it (their local `Providers` wrapper, mirroring how
      `CurrencyProvider` rolled out) in the same commit as the conversion,
      not after. Converted so far (19 of ~67 remaining files, plus the 2
      shared components `ScreenHeader.tsx` and `Sheet.tsx` detailed below):
      `components/ui/InfoRibbon.tsx`, `components/settings/SettingsRow.tsx`,
      `components/insights/WhereItWentCard.tsx`,
      `components/insights/PaceCard.tsx`, `components/insights/LeaksCard.tsx`,
      `components/insights/ScanSnapshotCard.tsx` (last 3 this run: all three
      are conditionally mounted from the same parent, `app/(tabs)/insights.tsx`,
      behind `view === 'scan'` / `monthHasData`, and the only two test files
      that actually render that screen tree, `emptyStateSurfaces.test.tsx`
      and `insightsFirstScan.test.tsx`, already had `LocaleProvider` wired
      in from a prior run, so no test file changes were needed this run).
      Correction to the order below (found in a prior run):
      `components/leak-scan/CategoryTransactionsSheet.tsx` is NOT a small
      leaf despite the name. `ResultsScreen.tsx` mounts it unconditionally
      (it only returns null internally when no category is open), so any
      hook it calls unconditionally runs on every `ResultsScreen` render;
      that pulled in 7 test files (`resultsScreenActivation`,
      `resultsScreenUndo`, `resultsScreenLadder`,
      `resultsScreenPaywallPlacement`, `leakScanImportUndo`,
      `leakScanOnboardingExit`, `useCompleteScanOnboarding`), not "a couple."
      Do it later as its own deliberate slice with that full list in hand,
      not as a quick leaf pick. Same caution applies to any component
      reachable from `ResultsScreen`'s tree (`CategoryList.tsx`,
      `CategoryRow.tsx`, `TierBadge.tsx`, `KpiRow.tsx`, `HabitCard.tsx`,
      `ProjectionSection.tsx`, `ReviewQueueSheet.tsx`) — check
      `grep -rl "<ComponentName" __tests__` AND whether the parent that
      renders it is itself conditionally mounted before assuming a small
      blast radius. Genuinely small candidates verified before picking
      (worth reusing this check next time): grep the component name across
      `__tests__/`, then grep where the component itself is imported outside
      `__tests__/` to make sure it is not also reachable through a bigger,
      unconditionally-mounted screen; a hit inside a `/** ... */` comment
      (a cross-reference like "reused verbatim via HabitLeakRow, see
      LeaksCard.tsx") is not a real import, check the surrounding line.

      **`ScreenHeader.tsx` converted this run.** Its one `strings` usage
      (`accessibilityLabel={strings.common.back}`) now reads
      `const strings = useStrings();` inside the component instead of the
      static import. This is the component conversion only: the 13 screens
      that render `ScreenHeader` (`app/(tabs)/index.tsx`, `money.tsx`,
      `insights.tsx`, `categories.tsx`, `app/profile.tsx`, `app/paywall.tsx`,
      `app/habit/[id].tsx`, `app/category/[id].tsx`, and 5 leak-scan screens:
      `IntakeScreen`, `ScopeScreen`, `ResultsScreen`, `DeckScreen`,
      `GracefulFailure`) still import the static `strings` for their own
      usage; only their mounted `ScreenHeader` now goes through the catalog.
      Those 13 files' own call-site conversion is unrelated future work,
      picked off the leaf list like any other file.

      Test-side prerequisite done in the same commit, per the process
      below: `LocaleProvider` added to all 16 test files that render
      `ScreenHeader` (directly or via a screen it is mounted in), found by
      listing the exact test files each of the 13 importers appears in
      (`grep -rl "<ComponentName"` per file, deduplicated): `screenHeader`,
      `categoryDetailScreen`, `habitDetailPaywallPlacement`,
      `insightsFirstScan` (already had it), `moneyUpcomingTab`,
      `moneyMaterializerIntegration`, `moneyHabitsTab`, `categoriesEmptyState`,
      `categoriesDeleteConfirm`, `door3BreakSheet`/`todaySpentKept`/
      `todayQuoteRibbonPlacement`/`door1FirstRun` (already had it, Today's 4),
      `profile` (already had it), `scopeScreen`, `resultsScreenActivation`,
      `resultsScreenUndo`, `resultsScreenLadder`, `leakScanImportUndo`,
      `resultsScreenPaywallPlacement`, `deckScreen` (2 render trees in this
      one file, a primary `render()` and a `rerender()` further down with
      its own separate provider tree; both needed the addition, easy to
      miss the second one), `leakScanOnboardingExit` (renders
      `IntakeScreen`/`GracefulFailure` transitively via `LeakScanRoute` from
      `@/app/leak-scan`, not a direct `<ComponentName` match, found by
      tracing the route file's own imports). `PaywallScreen` and
      `IntakeScreen` alone (outside the `LeakScanRoute` path) have no
      dedicated test coverage today, so no test file changes were needed
      for those two importers. Full suite run (not just touched files)
      confirmed 103/103 green before committing, tsc clean.

      **`Sheet.tsx` converted this run.** Its one usage
      (`accessibilityLabel={strings.common.close}`) now reads
      `const strings = useStrings();` inside the component. Imported by 13
      sheet components across money/ (`AddUpcomingSheet`, `ExpenseSheet`),
      habit-logging/ (`PartialSlipSheet`, `PickOneSheet`), leak-scan/
      (`CategoryTransactionsSheet`, `PulseDayDetailSheet`,
      `ReviewQueueSheet`), settings/ (`CurrencySheet`, `LanguageSheet`),
      onboarding/ (`BreakHabitSheet`), plus `components/AddCategoryModal.tsx`,
      `components/ui/ConfirmSheet.tsx`, and `app/habit/[id].tsx` directly
      (its `EditSkipValueSheet`). This is the shared component conversion
      only: none of those 13 leaf sheets' own `strings` usage was touched.

      Blast radius lesson worth keeping: unlike a normal leaf component,
      Sheet's hooks (`useTheme`, `useReducedMotion`, and now `useStrings`)
      run whenever `<Sheet>` is mounted at all, before the `visible`-driven
      early return, so a leaf-component-only test-file grep undercounts.
      3 of the 13 importers (`CategoryTransactionsSheet`, `PulseDayDetailSheet`,
      `ReviewQueueSheet`) have no dedicated unit test and are reached only by
      being unconditionally mounted inside `ResultsScreen.tsx`; `BreakHabitSheet`
      the same way inside `app/(tabs)/index.tsx` (Today). The fix: because
      `ScreenHeader.tsx` (converted last run) is rendered on every one of
      these same screens (Today, Money, Insights, Categories, Profile,
      habit/category detail, the leak-scan screens), that run's test-file
      list already exhaustively covers this same full-screen blast radius,
      confirmed by checking every full-screen test file
      (`moneyHabitsTab`, `moneyMaterializerIntegration`, `moneyUpcomingTab`,
      `categoriesDeleteConfirm`, `categoriesEmptyState`, `profile`,
      `categoryDetailScreen`, Today's `door1FirstRun`/`door3BreakSheet`/
      `todayQuoteRibbonPlacement`/`todaySpentKept`, and the `resultsScreen*`/
      `deckScreen`/`leakScanOnboardingExit` leak-scan set) already had
      `LocaleProvider` before this run touched anything. Only the leaf-only
      unit tests needed a fresh addition: `partialSlipSheet`, `pickOneSheet`,
      `addUpcomingSheet`, `silentWrite`, `expenseSheet`, `currencySheet`,
      `confirmSheet`, `addCategoryModal`, `editSkipValueSheet`, plus
      `sheetHeader.test.tsx` (tests `Sheet.tsx` itself directly via its
      `header` prop, found separately since it is not one of the 13
      importers). `habitsSeedStartSameTick.test.tsx` looked like a Today-screen
      match on a first grep but only mentions `app/(tabs)/index.tsx` in a
      comment; it renders a bare `HabitsProvider` harness with no `Sheet` in
      the tree at all, so it needed no change; same doc-comment-vs-real-import
      caution as `CategoryList.tsx`/`HabitsList.tsx`/`HabitLeakRow.tsx` before it.

      Two more fixes needed once `LocaleProvider` was added, both because
      `LocaleContext.tsx` pulls in `utils/storage.ts` (AsyncStorage) where the
      component under test previously did not: `confirmSheet.test.tsx` had no
      `jest.mock('@react-native-async-storage/async-storage', ...)` at all
      (added); `sheetHeader.test.tsx` already had the mock. Check for this on
      any future test file whose only provider was `ThemeProvider` before.

      Full suite run (not just touched files) confirmed 103/103 green before
      committing, tsc clean.

      **`CategoryTransactionsSheet.tsx` and its ResultsScreen-tree neighbors
      converted this run** (`CategoryList.tsx`, `TierBadge.tsx`, `KpiRow.tsx`,
      `HabitCard.tsx`, `ProjectionSection.tsx`, `ReviewQueueSheet.tsx`,
      `CategoryTransactionsSheet.tsx`), plus `components/CategoryRow.tsx`
      (mounted under `app/(tabs)/categories.tsx`, not a `ResultsScreen`
      neighbor but the same shape and picked up in the same batch). All
      eight are ordinary leaf components (hooks only run when the parent
      actually renders them, unlike `Sheet.tsx`'s always-mounted case), each
      already reachable only from screens whose test files got
      `LocaleProvider` in the `ScreenHeader.tsx`/`Sheet.tsx` runs
      (`resultsScreenActivation`, `resultsScreenUndo`, `resultsScreenLadder`,
      `resultsScreenPaywallPlacement`, `leakScanImportUndo`,
      `leakScanOnboardingExit` for the `ResultsScreen` set;
      `categoriesEmptyState`, `categoriesDeleteConfirm`, `categoryDetailScreen`
      for `CategoryRow`), confirmed with the grep-for-import-sites check
      before picking each one (`TierBadge`/`KpiRow` are also used from
      `components/insights/ScanSnapshotCard.tsx`, itself already converted
      and covered). No test file changes needed. Full suite run confirmed
      105/105 green (up from 103, reflecting other streams' merges since
      last run) before committing, tsc clean.

      **`BiggestLeakCard.tsx`, `ResultsFooter.tsx`, `QuestionCard.tsx`
      converted this run** (same run, second slice): three more ordinary
      leaves. `BiggestLeakCard` is mounted from both `ResultsScreen.tsx` and
      `DeckScreen.tsx` (both already `LocaleProvider`-covered; `deckScreen`'s
      two render trees confirmed still both carrying it). `ResultsFooter`
      is `ResultsScreen`-only (covered). `QuestionCard` is mounted only from
      `IntakeScreen.tsx`, which (like `PaywallScreen`) has no dedicated test
      coverage today, confirmed by `grep -rl "IntakeScreen\|QuestionCard"
      __tests__` returning nothing, so no test file was at risk either way.
      Full suite still 105/105, tsc clean.

      **Found and deferred, not converted:** `SpendPulse.tsx` builds its
      `GRANULARITY_OPTIONS` array (day/month/year labels) at module scope
      from `strings.leakScan.pulseGranularity*`, the same shape as
      `app/profile.tsx`'s module-level `SUPPORT_MAILTO_URL` flagged
      previously: not a three-line hook swap, the array needs to move inside
      the component (built with `useMemo` alongside `styles`, most likely).
      Left for its own pick along with `profile.tsx`; watch for this same
      module-scope pattern (`strings.` referenced outside any function
      component or hook) before assuming any remaining file is a quick leaf.

      **`EventHistory.tsx`, `HistoryCalendar.tsx` converted (a later run):**
      both `app/habit/[id].tsx`-only leaves (habit detail screen), confirmed
      via `habitDetailPaywallPlacement.test.tsx` (already `LocaleProvider`-
      covered) rendering the full `HabitDetailScreen` and unconditionally
      reaching both (one of the two always renders, gated on `isDaily`, not
      both-conditional). No test file changes needed.

      **`CheckInCard.tsx`, `LeakCard.tsx`, `KeptHero.tsx` converted (same
      run):** found a second instance of the module-scope pattern:
      `CheckInCard.tsx` has two module-level helper *functions* (not the
      module-level *array* shape `SpendPulse.tsx`/`LongArc.tsx` have),
      `chapterCopy` and `confirmationCopy`, that read the static `strings`
      import directly rather than being called from within a component. Both
      now take the catalog as an added parameter (`Catalog` type from
      `utils/i18n.ts`), threaded from `useStrings()` at every call site
      (`CheckInCardImpl` calls both directly; `ConfirmationBlock`, a real
      child component in the same file, gets `strings` prop-drilled in like
      its existing `theme`/`format` props, its own `confirmationCopy` call
      passing that prop through). This shape (a plain helper *function*,
      fixable by adding one parameter) is meaningfully smaller work than the
      module-level *array* shape (`SpendPulse.tsx`, and now `LongArc.tsx`
      below), which needs restructuring into the render body; check which
      shape a flagged file actually has before estimating its cost.
      `LeakCard.tsx` and `KeptHero.tsx` are ordinary leaves, no helper-
      function complication. All three share three leaf-only test files
      (`checkInCardAnnounce`, `renderedA11y`, `dynamicType`), each missing
      `LocaleProvider`, added to all three in this commit. `KeptHero` is
      also mounted by `PayoffScreen.tsx` (not yet converted itself), so
      `payoffScreen.test.tsx` needed `LocaleProvider` too, found only after
      a first full-suite run failed on it: importer coverage for a component
      that is itself already converted is not the whole check when the
      component you are converting is mounted somewhere else too; the
      "found and deferred" `KeptHero` import in `PayoffScreen.tsx` from an
      earlier run's own grep should have flagged this ahead of time. Full
      suite 105/105, tsc clean.

      **`PartialSlipSheet.tsx`, `PickOneSheet.tsx` converted (same run):**
      both are `Sheet.tsx` importers already covered by the `Sheet.tsx`
      run's 10 leaf-only test files (`partialSlipSheet`, `pickOneSheet`),
      confirmed by grep before starting; no test file changes needed.
      `PickOneSheet.tsx` has the same module-scope-*function* pattern as
      `CheckInCard.tsx`: `cadenceLabel`, one call site, fixed the same way
      (added `strings: Catalog` parameter). Full suite still 105/105, tsc
      clean. This confirms the "13 Sheet importers' own strings usage" wave
      flagged below is mostly this same easy shape, not automatically
      SpendPulse-shaped; check each file rather than assuming either way.

      **`SpentKeptChips.tsx` converted (same run):** ordinary leaf, only
      importer is `app/(tabs)/index.tsx` (Today), already covered. Its
      leaf-only unit test (`tabGeometry.test.tsx`) needed `LocaleProvider`
      added. Full suite 105/105, tsc clean.

      **`HabitLeakRow.tsx` converted (same run):** ordinary leaf. Importers
      `app/(tabs)/money.tsx` (via `HabitsList.tsx`) and `insights.tsx` (via
      the already-converted `LeaksCard.tsx`) were both already covered
      (`moneyHabitsTab.test.tsx`, `emptyStateSurfaces.test.tsx`, both
      checked before picking); only the leaf-only `habitLeakRow.test.tsx`
      needed `LocaleProvider` added. Full suite 105/105, tsc clean.

      **Found and deferred, not converted:** `LongArc.tsx` builds a
      `CHAPTERS` array from `strings.habitLogging.chapterXxx` labels at
      module scope, the same array shape as `SpendPulse.tsx` (not the
      smaller helper-function shape `CheckInCard.tsx`/`PickOneSheet.tsx`
      turned out to have). Its only importer is `app/habit/[id].tsx`
      (already covered), so when it is picked up the test-file side is
      free; the work is entirely moving the array construction into the
      component body. Grouped with `SpendPulse.tsx` and `app/profile.tsx`
      below for a future dedicated pick.

      **`WeekStrip.tsx`, `useCheckInFeedback.ts` converted (a later run):**
      both scoped as good next candidates by the previous run's HANDOFF.
      `WeekStrip.tsx` is an ordinary leaf, only importer `CheckInCard.tsx`
      (already covered). `useCheckInFeedback.ts` is a hook (name starts
      `use`), called unconditionally from `CheckInCard.tsx`, `app/habit/
      [id].tsx`, and `app/(tabs)/index.tsx`, all already `LocaleProvider`-
      covered; called `useStrings()` directly at its top level and added
      `strings` to its one `useCallback`'s deps. No test file changes
      needed. Full suite 109/109, tsc clean.

      **`SpendPulse.tsx`, `LongArc.tsx`, `app/profile.tsx` converted (same
      run):** the three module-scope picks. `SpendPulse.tsx`'s
      `GRANULARITY_OPTIONS` and `LongArc.tsx`'s `CHAPTERS` (both the
      module-level *array* shape) moved into a `useMemo` inside the
      component, alongside the existing `styles` memo, with `strings` in
      the deps array. `app/profile.tsx`'s `SUPPORT_MAILTO_URL` (a plain
      module-level `const` reading `strings.settings.supportEmail`, a third
      shape distinct from both the array and helper-function ones) became
      a one-line `useMemo` the same way. All three importers already
      `LocaleProvider`-covered (`ResultsScreen.tsx`, `app/habit/[id].tsx`,
      and `profile.tsx`'s own test respectively, the last already carrying
      it because the screen already calls `useLocale()` directly for the
      language row). `LongArc.tsx`'s grep also hit `CheckInCard.tsx`,
      `CoachMomentSlot.tsx`, `ViewQuote.tsx`; all three were doc-comment
      cross-references, not real imports, confirmed before ruling them in
      or out. No test file changes needed for any of the three. Full suite
      109/109, tsc clean throughout.

      **`CurrencySheet.tsx`, `LanguageSheet.tsx`, `QuickLogRow.tsx`,
      `ExpenseRow.tsx`, `LoggedTodayList.tsx`, `HabitsList.tsx` converted
      (run 10):** six ordinary leaves, all `strings.` usage inside the
      component body, no module-scope shape. `CurrencySheet`/`LanguageSheet`
      are `app/profile.tsx`-only (already covered, `profile.test.tsx`).
      `QuickLogRow`/`LoggedTodayList` are `app/(tabs)/index.tsx`-only
      (Today's 4 test files already covered them); `QuickLogRow`'s own
      leaf-only `quickLogRow.test.tsx` needed `LocaleProvider` added (it had
      none before, unlike `loggedTodayList.test.tsx` which already carried
      it). `HabitsList` is `app/(tabs)/money.tsx`-only (`moneyHabitsTab.test.tsx`
      already covered). `ExpenseRow` is imported only by `SpentList.tsx` and
      `LoggedTodayList.tsx` (both covered once `SpentList`'s own test got
      `LocaleProvider`, below), confirmed via precise `import.*ExpenseRow`
      grep after an earlier plain-name grep produced false-positive hits
      inside other files' doc comments (`CheckInCard.tsx`, `EmptyState.tsx`).

      **`SpentList.tsx` converted (same run):** its `dayLabelFor` is a
      third example of the module-scope *helper-function* shape
      (`CheckInCard.tsx`'s `chapterCopy`/`confirmationCopy`,
      `PickOneSheet.tsx`'s `cadenceLabel`), fixed the same way: added a
      `strings: Catalog` parameter, threaded from `useStrings()` at both of
      `dayLabelFor`'s call sites inside `renderSectionHeader`. Only
      `app/(tabs)/money.tsx` imports `SpentList` (an `app/category/[id].tsx`
      hit on a plain-name grep was a doc comment, not an import, confirmed
      before ruling it in). `moneyMaterializerIntegration.test.tsx` and
      `emptyStateSurfaces.test.tsx` (both mount it) already had
      `LocaleProvider`; only its leaf-only `spentList.test.tsx` needed it
      added. Full suite 109/109, tsc clean.

      **`AddCategoryModal.tsx`, `LeakFinderTeaser.tsx`, `ExpenseSheet.tsx`,
      `BeatMedia.tsx` converted (run 11):** four ordinary leaves, all
      `strings.` usage inside the component body, no module-scope shape
      (confirmed per file before picking, same check as always).
      `AddCategoryModal` is imported by `app/category/[id].tsx` and
      `app/(tabs)/categories.tsx` (both already `LocaleProvider`-covered:
      `categoryDetailScreen`, `categoriesDeleteConfirm`,
      `categoriesEmptyState`); its own leaf test `addCategoryModal.test.tsx`
      already had `LocaleProvider`, no change needed. `LeakFinderTeaser` is
      `app/(tabs)/insights.tsx`-only, conditionally mounted behind
      `view === 'scan'`; no test file (`grep -rl "LeakFinderTeaser"
      __tests__` returns nothing) actually renders that branch today, same
      as the earlier `QuestionCard`/`IntakeScreen` no-coverage cases, so no
      test file changes were at risk either way. `ExpenseSheet` is imported
      by `app/(tabs)/money.tsx` and `app/(tabs)/index.tsx` (both covered);
      its own leaf test `expenseSheet.test.tsx` already had
      `LocaleProvider`.

      `BeatMedia.tsx` needed real test-file work: its only importer is
      `components/onboarding/OnboardingCarousel.tsx` (itself NOT converted,
      still module-scope-array-shaped, unrelated to converting the child),
      which in turn is rendered unconditionally from
      `app/onboarding/welcome.tsx`. Three test files actually mount that
      tree and none had `LocaleProvider`: `beatMedia.test.tsx` (renders
      `OnboardingCarousel` directly, found via `grep -rl "BeatMedia"
      __tests__`, not a direct `<BeatMedia` render but the real vehicle for
      exercising it), `onboardingCarousel.test.tsx` (same component,
      standard `Providers` wrapper), and `onboardingStepMachineRevive.test.tsx`
      (renders `OnboardingWelcomeScreen` itself; its own doc comment
      confirms "the carousel is now the only onboarding destination", i.e.
      unconditional, so it reaches `BeatMedia` too even though neither
      `OnboardingCarousel` nor `BeatMedia` appears anywhere in that test
      file's text — found only by tracing the welcome screen's real render
      tree, not by grepping the component name; the other apparent
      `welcome`-related test-name hits (`onboardingIntentRedirect`,
      `useCompleteScanOnboarding`, `resultsScreenActivation`,
      `auroraBackground`, `profile`, `leakScanOnboardingExit`) were all
      route-string references (`'/onboarding/welcome'` as a navigation
      target) or doc-comment cross-references, not renders, confirmed
      before ruling them out). All three already had the AsyncStorage mock
      `LocaleContext.tsx` needs, so `LocaleProvider` alone was enough.
      Lesson for next time a component is buried inside an unconverted
      parent: the leaf-verification grep for the component's own name can
      miss real render sites; also grep for the parent chain (here,
      `OnboardingCarousel` then `welcome`) and check each hit's doc comments
      for "unconditional"/"always renders" language before ruling a test
      file out. Full suite 109/109, tsc clean.

      Remaining suggested order: continue picking genuinely small
      single-parent leaf files (re-run the leaf check above per candidate;
      do not assume shape from a file's name or its position in the list;
      three module-scope shapes are now confirmed, module-level array,
      module-level helper function, and module-level plain const, so check
      which one (if any) applies before estimating cost). 23 files still
      import the static `strings` catalog directly (rerun `grep -rl
      "from '@/constants/strings'" app components contexts utils | grep -v
      __tests__` for the current list), among them `UpcomingList.tsx`
      (found and deferred, run 10: its `WINDOW_LABELS` is the module-level
      *array* shape, same fix as `SpendPulse.tsx`/`LongArc.tsx`, needs
      moving into the component body; only importer is `app/(tabs)/money.tsx`,
      already `LocaleProvider`-covered, but its own leaf-only
      `upcomingList.test.tsx` will need `LocaleProvider` added),
      `BreakHabitSheet.tsx` and `OnboardingCarousel.tsx` (found and
      deferred, run 11: both have the module-level *array* shape at lines
      near their top, `BreakHabitSheet.tsx` has two arrays plus a
      module-level helper function `yearlyLine`, i.e. two of the three
      confirmed shapes in one file; budget accordingly rather than treating
      either as a quick leaf), the 13 `ScreenHeader` importers' and
      remaining `Sheet` importers' own `strings` usage (for these, re-run
      the same "does the parent screen already carry `LocaleProvider` for a
      shared-component reason" check before assuming a fresh test-file list
      is needed), and the leak-scan screen set (`BillsScreen.tsx`,
      `DeckScreen.tsx`, `GracefulFailure.tsx`, `IntakeScreen.tsx`,
      `PayoffScreen.tsx`, `PulseDayDetailSheet.tsx`, `ResultsScreen.tsx`,
      `ScopeScreen.tsx`, `useTrackLeak.tsx`), not yet individually
      leaf-checked as of run 11. Note for that pass:
      `utils/coachMoments.ts`, `utils/recurring.ts`, and
      `contexts/ReportsContext.tsx` import `strings` but are not simple
      hook-eligible leaves (`coachMoments.ts` and `recurring.ts` are plain
      functions, not components or hooks, so they cannot call
      `useStrings()` directly; they need the catalog passed in as a
      parameter instead, decide the shape when their turn comes).
      `components/today/ViewQuote.tsx` and `useViewQuote.ts` are RETIRED
      (ADR 0037, nothing renders them any more, kept only as a documented
      revert path like `AuroraBackground.tsx`); low priority for this
      routine since no live surface depends on them, but still on the list.

      **`UpcomingList.tsx`, `OnboardingCarousel.tsx`, `BreakHabitSheet.tsx`,
      `AddUpcomingSheet.tsx` converted (run 12):** all four of run 11's
      found-and-deferred module-scope files, plus one more found this run.
      `UpcomingList.tsx`'s `WINDOW_LABELS`/`WINDOW_OPTIONS` (module-level
      array shape) moved into a `useMemo` inside the component; its child
      `UpcomingRow` (a real function component, not inline JSX) reads
      `strings.money.multiPaymentPill` outside the parent's hook scope, so
      it now takes `strings: Catalog` as an added prop, same shape as
      `CheckInCard.tsx`'s `ConfirmationBlock`. Only importer
      `app/(tabs)/money.tsx` (covered); leaf-only `upcomingList.test.tsx`
      needed `LocaleProvider` added.

      `OnboardingCarousel.tsx`'s `BEATS` is a genuinely new fourth shape:
      an **exported** module-level array, used both as the render default
      and directly as a test fixture (`beatMedia.test.tsx` imports `BEATS`
      itself to build a `CAPTURED` array with assets, checking only
      `.length`, never the English text). Converted to a `buildBeats(catalog)`
      function; `export const BEATS = buildBeats(strings)` keeps the static
      English export unchanged for that fixture and the prop default's
      shape, while the component itself now computes
      `useMemo(() => buildBeats(strings), [strings])` from `useStrings()`
      and falls back to that only when no `beats` override prop is passed.
      Net effect: real usage is now locale-reactive, the test fixture is
      untouched. All three of its test files (`beatMedia`,
      `onboardingCarousel`, `onboardingStepMachineRevive`, the last via the
      `welcome.tsx` render tree) already had `LocaleProvider` from
      `BeatMedia`'s run-11 conversion; no test file changes needed. Any
      future `grep -rl "from '@/constants/strings'"` sweep will still list
      this file, because the static import stays for building `BEATS`; that
      is expected, not a sign the conversion was missed.

      `BreakHabitSheet.tsx` had exactly the two arrays plus one helper
      function flagged in run 11: `CADENCE_OPTIONS`/`BOUGHT_OPTIONS` moved
      into `useMemo`s, `yearlyLineFor` (the helper function, previously
      named `yearlyLine`) took an added `strings: Catalog` parameter at its
      one call site. Only importer `app/(tabs)/index.tsx` (Today), already
      covered by all three of its test files
      (`door3BreakSheet`/`todaySpentKept`/`todayQuoteRibbonPlacement`); no
      test file changes needed.

      `AddUpcomingSheet.tsx` (found this run, not on run 11's list): two
      module-level arrays, `NAME_CHIPS` and `MONTH_DAY_CHIPS`, became
      `buildNameChips(catalog)`/`buildMonthDayChips(catalog)` functions.
      The wrinkle here, a variant on the helper-function shape: a *third*
      module-level function, `draftFromExpense(expense)`, read `NAME_CHIPS`
      directly to reverse-match a row's title back to its chip on edit-mode
      open; it now takes the resolved `nameChips` array as a second
      parameter, threaded from the component's `useMemo` at its one call
      site (inside the sheet's reset `useEffect`). Only importer
      `app/(tabs)/money.tsx`; both `addUpcomingSheet.test.tsx` (leaf-only)
      and `moneyUpcomingTab.test.tsx` (opens it in edit mode from a tapped
      row) already had `LocaleProvider`; no test file changes needed.

      All four converted in one commit each; `tsc --noEmit` clean and the
      full suite green (109/109, 1147/1147) after every commit.

      **`app/(tabs)/_layout.tsx`, `app/(tabs)/money.tsx`,
      `app/(tabs)/categories.tsx` converted (run 13):** all three ordinary
      leaf-shaped screens, no module-scope pattern in any of them (checked
      per file before starting, per the standing caution).

      `_layout.tsx` (found run 12, converted this run): its four
      `strings.tabs.*` title usages sit inside `TabLayout`'s component
      body (passed to `Tabs.Screen options`), not module scope, so this
      was a plain `useStrings()` swap despite being a top-level layout
      component mounted unconditionally. No test file renders the tab
      layout directly (`grep -rl "(tabs)/_layout\|TabLayout" __tests__`
      returns nothing), so no test file changes were at risk either way.

      `money.tsx`'s six `strings.` usages (three segment labels, the
      screen title, the profile header action label) are all inside
      `MoneyScreen`'s body; the `segments` `useMemo` was missing `strings`
      from its deps array (added). All four test files that render this
      screen (`moneyUpcomingTab`, `moneyMaterializerIntegration`,
      `moneyHabitsTab`, and `moneyPager`, the last not previously listed
      in HANDOFF but confirmed already `LocaleProvider`-covered too) needed
      no changes.

      `categories.tsx`'s usages (including one function-valued string,
      `strings.categories.deleteTitle(name)`, called directly in JSX, not
      module scope) are all inside `CategoriesScreen`'s body; the
      `sections` `useMemo` was missing `strings` from its deps (added
      alongside the existing `categories`/`getDefaultCategories`/
      `getCustomCategories`). Both test files that render this screen
      (`categoriesEmptyState`, `categoriesDeleteConfirm`) already had
      `LocaleProvider`; no test file changes needed.

      All three converted in one commit each; `tsc --noEmit` clean and the
      full suite green (109/109, 1147/1147) after every commit. One
      pre-existing flake noted and cleared: `door3BreakSheet.test.tsx`
      timed out once under full-suite load at session start (before any
      code change), passed standalone and on every full-suite re-run after
      that; not investigated further as it reproduces on main too and is
      unrelated to this stream (see HANDOFF's Notes section).

      **`app/(tabs)/insights.tsx`, `app/category/[id].tsx`,
      `app/habit/[id].tsx` converted (run 14):** all three leaf-checked
      first per the standing caution; none had a module-scope shape.

      `insights.tsx`'s 12 usages are all inside `InsightsScreen`'s body;
      the `segments` `useMemo` was missing `strings` from its deps
      (added). Both test files that render it (`insightsFirstScan`,
      `insightsPager`) already had `LocaleProvider`.

      `category/[id].tsx`'s 15 usages are all inside
      `CategoryDetailScreen`'s body (the module-level
      `accessibleIdentityColor` helper does not read `strings`); none of
      its `useMemo`/`useCallback` hooks read `strings`, so no deps
      changes were needed. Its one test file
      (`categoryDetailScreen.test.tsx`) already had `LocaleProvider`.

      `habit/[id].tsx` has three separate function components, each
      converted independently: `HabitDetailScreen` (the screen),
      `HabitDetailBreaking` (a real child component defined in the same
      file, not module scope), and the exported `EditSkipValueSheet` (a
      standalone `Sheet.tsx` importer, already covered by that run's
      test-file sweep). `StatBlock` and the module-level
      `periodSkipCount` helper do not read `strings`, so neither needed
      the `Catalog`-parameter treatment. No `useMemo`/`useCallback` in
      the file reads `strings`. Its screen-level test
      (`habitDetailPaywallPlacement`) and the sheet's own leaf test
      (`editSkipValueSheet`) already had `LocaleProvider`.

      All three files converted in one commit each; `tsc --noEmit` clean
      and the full suite green (109/109, 1147/1147) after every commit.

      **Run 15: two more files converted**, both leaf-checked before
      starting per the standing caution:
      `components/today/HowItWorksSheet.tsx` (4 usages, all inside the
      component body; only imported by `app/(tabs)/index.tsx`, mounted
      unconditionally behind its own `visible` prop like `Sheet.tsx`'s
      blast-radius lesson, so it inherits Today's screen-tree test
      coverage; the four Today test files
      (`door3BreakSheet`/`todaySpentKept`/`todayQuoteRibbonPlacement`/
      `door1FirstRun`) already had `LocaleProvider`, no test file changes
      needed) and `app/paywall.tsx` (26 usages, all inside
      `PaywallScreen`'s own body, `plans`/`features` are plain consts
      recomputed every render so no useMemo/useCallback deps to touch; no
      test renders `PaywallScreen` itself, `habitDetailPaywallPlacement`/
      `resultsScreenPaywallPlacement` only assert navigation to the
      `/paywall` route, so no test file changes needed). Also fixed this
      run, before either conversion, per the standing rebase-risk note
      below: two new test files landed on main since the last rebase
      (`dockGeometry.test.tsx`, `emptyStateGeometry.test.tsx`) rendering
      already-converted `QuickLogRow`/`SpentList`/`LeakFinderTeaser`
      without `LocaleProvider` in their local `Providers` wrapper; both
      fixed in one commit. `tsc --noEmit` clean and the full suite green
      (112/112, 1166/1166) after every commit this run.

      **`app/(tabs)/index.tsx` (Today) converted (run 16):** the last
      unconverted top-level screen, 34 `strings.` hits, ~1450 lines. One
      module-scope shape found: `FIRST_RUN_RIBBON_LINES`, a module-level
      `Record<string, string>` built from four `strings.today.*` values
      (a fifth shape, a module-level *keyed object* rather than an array,
      but fixed the identical way, moved into a `useMemo` inside
      `TodayScreen` alongside the existing `styles` memo, both usage
      sites updated to the local `firstRunRibbonLines` name). Everything
      else in the file (the single `TodayScreen` function component; no
      other function components defined in the file) reads `strings`
      inside the component body. Three `useMemo`/`useCallback` blocks
      were missing `strings` from their deps and got it added:
      `handleBreakSheetStart` (reads `strings.today.alreadyBreakingToast`
      and `strings.toasts.startHabitFailed`), the `sections` useMemo
      (reads `strings.habitLogging.leaksFoundSection`/
      `breakingNowSection`), and `handleDismissHabit` (reads three
      `strings.toasts.*` values). `breakLabel`/`breakCaption` and
      `detectionProgress` needed no deps change (plain consts recomputed
      every render, or a useMemo that does not read `strings`,
      respectively). All four test files that render this screen
      (`door3BreakSheet`, `todaySpentKept`, `todayQuoteRibbonPlacement`,
      `door1FirstRun`) already had `LocaleProvider` from an earlier run;
      two more candidates checked and ruled out per the standing
      caution, `habitsSeedStartSameTick.test.tsx` (comment-only mention,
      confirmed again, same as run 11) and `dynamicType.test.tsx` (reads
      the file as text via `fs`, does not render it). No test file
      changes needed. Full suite green (112/112, 1166/1166) after one
      re-run past a known pre-existing `door3BreakSheet.test.tsx`
      full-suite-load flake (see HANDOFF Notes); `tsc --noEmit` clean.

      **Not yet converted, remaining 15 files after run 16** (rerun `grep
      -rl "from '@/constants/strings'" app components contexts utils |
      grep -v __tests__` for the current list). The leak-scan screen set
      (`BillsScreen.tsx`, `DeckScreen.tsx`, `GracefulFailure.tsx`,
      `IntakeScreen.tsx`, `PayoffScreen.tsx`, `PulseDayDetailSheet.tsx`,
      `ResultsScreen.tsx`, `ScopeScreen.tsx`, `useTrackLeak.tsx`) remains
      exactly as scoped since run 11 (still not individually
      leaf-checked, budget more than one run's slice per the standing
      note; this is now the largest remaining chunk). `components/today/
      ViewQuote.tsx`/`useViewQuote.ts` are RETIRED (see below).
      `components/onboarding/OnboardingCarousel.tsx` will always appear
      on the grep (its static import builds the exported `BEATS` fixture
      by design, see run 12's note; already converted for real
      rendering). `utils/coachMoments.ts`, `utils/recurring.ts`,
      `contexts/ReportsContext.tsx` (non-hook threading shape TBD) also
      remain, unchanged from run 11's notes.

      **Run 17: 7 of the 9 leak-scan screen-set files converted.**
      `useTrackLeak.tsx` (a hook, not a component; called `useStrings()`
      unconditionally at its top level like `useCheckInFeedback.ts` did,
      added `strings` to both `trackLeak`'s and `startBreaking`'s
      `useCallback` deps). `PulseDayDetailSheet.tsx` (ordinary leaf;
      its `if (!cell) return null` early return sits AFTER the hook
      calls, so `useStrings()` slots in next to `useTheme()`/
      `useCurrency()` with no reordering; its own `formatCellDate`
      module-level helper does not read `strings`, only date-parses).
      `PayoffScreen.tsx`, `GracefulFailure.tsx`, `DeckScreen.tsx`,
      `IntakeScreen.tsx`, `ScopeScreen.tsx`: five ordinary screen leaves,
      no module-scope shape in any of them. Four of the five (all but
      `PayoffScreen`, whose existing effect already depended on a
      derived `evidence` value that itself recomputes from `strings`
      every render) have the flow's standing "announce on mount"
      `useEffect` pattern (`AccessibilityInfo.announceForAccessibility`)
      with a `[]` or partial deps array reading `strings` directly;
      added `strings` to each of those deps arrays, a variant of the
      standing useMemo/useCallback-deps rule that applies the same way
      to a `useEffect` closing over `strings`.

      Test coverage: `deckScreen.test.tsx`, `payoffScreen.test.tsx` and
      `scopeScreen.test.tsx` already had `LocaleProvider` (confirmed
      before starting). `useTrackLeak`/`PulseDayDetailSheet` have no
      leaf tests of their own; both are reached only through
      `DeckScreen`/`ResultsScreen`, whose test suites (`deckScreen`,
      `resultsScreenActivation`/`resultsScreenUndo`/`resultsScreenLadder`/
      `resultsScreenPaywallPlacement`/`leakScanImportUndo`/
      `leakScanOnboardingExit`) were already `LocaleProvider`-covered
      from the `ScreenHeader.tsx`/`Sheet.tsx` runs. `IntakeScreen.tsx`
      still has no dedicated leaf test (confirmed again, same as the
      run 11 note on `PaywallScreen`); its only real render path is
      `leakScanOnboardingExit.test.tsx` via `LeakScanRoute`, already
      covered. `GracefulFailure`'s only near-hits
      (`useCompleteScanOnboarding.test.tsx`) are a doc-comment
      cross-reference and a probe component, not a real render,
      confirmed before ruling it out; its real coverage is the same
      `leakScanOnboardingExit` path. No test file changes were needed
      for any of the seven files. Two commits (the hook/small-screen
      batch, then Intake/Scope); `tsc --noEmit` clean and the full suite
      green (112/112, 1166/1166) after each, no flake either run.

      **Remaining leak-scan screen set: `ResultsScreen.tsx` (791 lines,
      15 usages, a `memo`-wrapped `HabitCardItem` child component at
      module scope that does not itself read `strings`, and one
      module-level helper function `evidenceWindowLabel` that does, the
      same helper-function shape `CheckInCard.tsx`/`PickOneSheet.tsx`/
      `SpentList.tsx` had) and `BillsScreen.tsx` (314 lines, 15 usages,
      a module-level helper function `cadenceLabel` reading `strings`
      directly, same shape). Both budgeted for a dedicated run given
      size; `ResultsScreen.tsx` in particular mounts
      `CategoryTransactionsSheet`/`ReviewQueueSheet`/
      `PulseDayDetailSheet` and calls `useTrackLeak`, all already
      converted, so its own conversion is additive on top, not a new
      blast-radius investigation.**

      **Run 18: `ResultsScreen.tsx` and `BillsScreen.tsx` converted,
      completing the leak-scan screen set (9 of 9 files).** Both had
      the module-level helper-function shape flagged above:
      `evidenceWindowLabel` (`ResultsScreen.tsx`) and `cadenceLabel`
      (`BillsScreen.tsx`) each took an added `strings: Catalog`
      parameter, threaded from `useStrings()` at their one and two call
      sites respectively (`cadenceLabel`'s two sites both sit inside
      `renderRow`, itself a plain function defined in the component
      body, not module scope, so no deps array applies to it).
      `ResultsScreen.tsx` also needed `strings` added to three
      `useCallback` deps arrays (`handleSaveProjection`, `handleUndo`,
      `handleBringInDays`) and both screens needed it added to their
      announce-on-mount `useEffect` (same variant of the standing rule
      run 17 established). Test coverage: all six of
      `ResultsScreen.tsx`'s test files
      (`resultsScreenActivation`/`resultsScreenUndo`/
      `resultsScreenLadder`/`resultsScreenPaywallPlacement`/
      `leakScanImportUndo`/`leakScanOnboardingExit`) already had
      `LocaleProvider` from earlier runs; `useCompleteScanOnboarding.test.tsx`
      confirmed again as a doc-comment cross-reference and probe
      component, not a real render (same as run 17's note on
      `GracefulFailure`). `billsScreen.test.tsx` had no `LocaleProvider`
      at all (it renders `BillsScreen` directly, its own dedicated leaf
      test); added it. One commit; `tsc --noEmit` clean, full suite
      green (112/112, 1166/1166), no flake.

      68 of ~75 call-site files now converted. Confirmed via
      `grep -rl "from '@/constants/strings'" app components contexts
      utils | grep -v __tests__`: exactly 7 files remain, all previously
      flagged as non-standard, none of them a screen or ordinary leaf:
      `components/today/ViewQuote.tsx` and `useViewQuote.ts` (RETIRED,
      ADR 0037), `components/onboarding/OnboardingCarousel.tsx`
      (intentional, builds the exported `BEATS` test fixture, real
      rendering already converted, see run 12), `utils/i18n.ts` itself
      (the seam, imports `strings` to derive `Catalog` and build
      `getCatalog`, never converts), and three genuine remaining-work
      files: `utils/coachMoments.ts`, `utils/recurring.ts`,
      `contexts/ReportsContext.tsx`. No top-level screen and no leak-scan
      file remains unconverted.

      **Investigated for the next run, not converted:** `utils/recurring.ts`
      has the module-level *plain-const* shape (`SCHEDULE_SEPARATOR =
      strings.money.scheduleSeparator`) plus two module-level helper
      *functions* (`weekdayPlural`, `monthDayLabel`) and one exported
      function (`describeSchedule`) that all read `strings` directly;
      none are components or hooks, so none can call `useStrings()`
      themselves, matching the "decide the shape when their turn comes"
      note from run 11. `describeSchedule` (and the separately exported
      `daysUntilLabel`, which does NOT read the catalog at all: it
      returns hardcoded English "Today"/"Tomorrow"/"in N days" text, a
      distinct gap from this item, worth its own note when item 2's
      catalog conversion reaches it) has exactly one call site outside
      `recurring.ts` and its own tests: `components/money/UpcomingList.tsx`
      (already converted, `useStrings()` available there), so the
      threading path is narrow, just not done yet. `utils/coachMoments.ts`
      resolves card copy from `strings.coachMoments` in one function
      (`resolveCoachCard` around line 234); its callers need tracing
      before threading. `contexts/ReportsContext.tsx` has one usage
      (`strings.reports.weekOf(...)`, a context provider, not a
      component render, so also not directly `useStrings()`-eligible
      without checking whether the provider itself sits under
      `LocaleProvider` in the tree). All three budgeted for a dedicated
      run; PLAN.md's item 2 call-site migration checkbox stays open
      until they, plus a decision on `ViewQuote`'s retired pair, land.

      **Run 19: all three converted**, closing out the genuine
      remaining-work set.
      `utils/recurring.ts`: the module-level plain-const `SCHEDULE_SEPARATOR`
      folded into a local `const separator = strings.money.scheduleSeparator;`
      inside `describeSchedule` (no need to keep it module-level once it
      reads a threaded catalog); `weekdayPlural`/`monthDayLabel` (the
      helper-function shape) and the exported `describeSchedule` itself
      each took an added `strings: Catalog` parameter. One call site
      outside the file and its own tests, `components/money/UpcomingList.tsx`
      line 233, already had `strings` in scope from its own earlier
      conversion (run 12); updated to pass it through. The other export,
      `daysUntilLabel`, still does not read the catalog at all (confirmed
      again, same gap flagged run 18): left untouched, it is a new-keys
      addition, not a call-site migration, out of this item's scope until
      item 2 (or a dedicated pick) adds a translated "Today"/"Tomorrow"/
      "in N days" key. `__tests__/recurrenceRule.test.ts` unit-tests
      `describeSchedule` directly (not through a component render), so it
      needed its own fix, distinct from every prior conversion's
      LocaleProvider-in-test-tree pattern: imported the static `strings`
      from `@/constants/strings` (the English catalog, appropriate for a
      pure-function unit test with no React tree) and passed it as the
      third argument at all 20 call sites. `__tests__/recurring.test.ts`
      (the separate byte-identical-dates pin) does not call
      `describeSchedule` and needed no change.

      `utils/coachMoments.ts`: the module-level helper-function shape
      again, one function, `cardText` (the plan's run-18 note called it
      `resolveCoachCard`; the actual name in the file is `cardText`, a
      stale name in that note, corrected here). Took an added
      `strings: Catalog` parameter. Three call sites outside the file and
      its own tests, all already `useStrings()`-converted with `strings`
      in scope at the call: `components/habit-logging/CheckInCard.tsx`
      (inside a `useMemo` that already had `strings` in its deps array
      from an earlier run, so no deps change needed here), `components/
      habit-logging/LeakCard.tsx` (plain render-body call), and
      `app/(tabs)/index.tsx` (Today, plain render-body call, not inside
      any memo). `__tests__/coachMoments.test.ts` unit-tests `cardText`
      directly (same shape as `describeSchedule`'s test): added the
      static `strings` import and passed it at both of its two call sites
      (a loop each, so 34 individual calls covered by 2 edits).

      `contexts/ReportsContext.tsx`: not a helper-function shape after
      all, once traced. Its one `strings.reports.weekOf(...)` usage
      (inside `calculateSpendingOverTime`, a `useCallback` in the
      `ReportsProvider` function component's own body) is directly
      `useStrings()`-eligible: `ReportsProvider` sits under
      `LocaleProvider` in `app/_layout.tsx`'s provider tree (confirmed
      before assuming so, per the plan's own note that this needed
      checking), so `const strings = useStrings();` was added at the top
      of the provider body like any other component conversion, with
      `strings` added to `calculateSpendingOverTime`'s previously-empty
      deps array. No new parameter threading, no other callers to update.
      Its only test coverage is transitive, through the two screens that
      render `ReportsProvider` (`insightsFirstScan.test.tsx`,
      `insightsPager.test.tsx`), both already `LocaleProvider`-covered
      from run 14; confirmed via `grep -rl "ReportsProvider"` that no
      other test file renders it directly. No test file changes needed.

      All three converted in one commit each; `tsc --noEmit` clean and
      the full suite green (112/112, 1166/1166) after every commit, no
      flake.

      **Decision made this run on `ViewQuote`'s retired pair**, closing
      the one item the run-18 note left open: `components/today/
      ViewQuote.tsx` and `useViewQuote.ts` stay unconverted. Confirmed
      again via `grep -rn "ViewQuote\|useViewQuote"` that every hit
      outside their own two files is a doc-comment cross-reference
      (`LongArc.tsx`, `constants/strings.ts`, `app/(tabs)/index.tsx`,
      `utils/storage.ts`), never a real import; ADR 0037 retired both,
      nothing renders them, kept only as a documented revert path (the
      same status as `constants/theme.ts`'s dark theme and
      `AuroraBackground.tsx`). Converting dead code that renders to no
      user has no observable i18n effect and no user ever sees it in any
      locale, so it is out of scope for a "full internationalization of
      the app a user experiences" reading of this plan, per the
      alternative the run-11/18 notes already offered. If ADR 0037 is
      ever reversed and the quote rotation un-retires, convert both then
      (a real hook + a small leaf, no unusual shape) rather than before.

      This closes plan item 2's call-site migration checkbox: every
      live-reachable screen and component now reads the catalog through
      `useStrings()` or a threaded `Catalog` parameter. The static
      `strings` import remains in exactly 4 files, all by design, not by
      omission: `utils/i18n.ts` (the seam), `components/onboarding/
      OnboardingCarousel.tsx` (builds the exported `BEATS` test fixture,
      run 12), and the RETIRED `ViewQuote.tsx`/`useViewQuote.ts` pair
      (this run's decision, above).
- [ ] Convert function-valued strings (pluralized/interpolated) to ICU
      messages with proper CLDR plural rules, not the current hand-rolled
      `n === 1 ? '' : 's'` ternaries, and add the ICU formatting dependency
      this needs (`i18n-js` or alternative) at that point, once actual
      catalog usage (item 4) shows what it needs.

## 3. Test migration

- [ ] Migrate tests asserting literal English string values to key-based or
      catalog-based assertions, so they do not break once non-English
      catalogs exist and do not silently stop testing anything either.

## 4. Provisional machine translations

- [ ] es, fr, de, pt-BR, it, ja, ko, zh-Hans, hi, nl catalogs. Every
      catalog file headed: "Provisional machine translation, needs human
      review."

      **Run 20: catalog infrastructure built, first proof-of-pattern slice
      populated for all 10 languages.** Before this run, `getCatalog()`
      resolved every locale to the same English `strings` object (plan
      item 2's placeholder); this run replaced that with real per-locale
      overlays, merged onto English.

      Design: rather than requiring each locale file to satisfy the full
      `Catalog` type (~660 keys, including pluralized function-valued
      entries with locale-specific CLDR rules) before it can ship at all, a
      locale file is a `LocaleOverlay` (`utils/i18n.ts`): a deep-partial of
      `Catalog` that widens `as const`'s string-literal leaves back to
      `string` and widens array element types the same way, but leaves
      function signatures untouched (a function-valued key is either
      supplied whole, with its own locale's pluralization baked in, or
      omitted and inherits the English function). `mergeCatalog(base,
      overlay)` recursively overlays a locale's translated keys onto
      English, key by key; an omitted key at any depth falls back to
      English rather than rendering blank. `getCatalog(locale)` memoizes
      the merged result per locale in a module-level `Map` (`en` always
      returns `strings` itself, no merge) so a component's `useStrings()`
      value stays referentially stable across renders for a fixed locale;
      without this, every `useMemo`/`useCallback` listing `strings` in its
      deps (the standing rule from plan item 2) would recompute every
      render once real overlays existed, since a fresh merge would be a
      fresh object each call. This lets every future run extend coverage
      section by section, language by language, independently, rather than
      blocking on one language's full ~660-key translation landing atomically.

      `locales/<code>.ts` (`pt-BR.ts` and `zh-Hans.ts` export `ptBR`/
      `zhHans`, valid identifiers for the hyphenated locale codes; every
      other file exports its own code as the identifier), one per target
      language, each headed "Provisional machine translation, needs human
      review" per this item's own requirement. This run's slice, populated
      in all 10: `common` (7 of its 8 keys; `keep` deliberately withheld,
      see below), `sheets` (2 keys), `tabs` (4 keys), `screenTitles` (4
      keys, trailing period preserved literally in every locale rather than
      swapped for a language-appropriate full stop, e.g. Japanese `。` or
      Hindi `।`; a Charen-reviewable choice, not a rule to enforce). 17 of
      ~660 keys now populated per language; every other section (all of
      `habitLogging`, `coachMoments`, `leakScan`, `onboarding`, `paywall`,
      etc.) still resolves to English via the merge fallback, same as
      before this run.

      `common.keep` withheld on purpose, not an oversight: close enough to
      the locked vocabulary (leak/skip/kept/slip) that a guessed
      translation risks the same drift the routine is explicitly told not
      to cause. `__tests__/localeCatalogs.test.ts` asserts no overlay
      supplies it, parameterized across all 10 locales, so a future run
      cannot reintroduce it by accident while extending `common`. Proposal
      table for the four locked terms (not `common.keep` specifically,
      which is a different, lower-stakes word) added to HANDOFF.md's
      DECISIONS NEEDED this run, ahead of translating the sections that
      actually contain them, per this item's own second checkbox below.

      One real test regression surfaced and fixed, not a design flaw:
      `__tests__/languageSheet.test.tsx` asserted `strings.common.cancel`
      (static English) would always be the sheet's own rendered Cancel
      text, true only because no catalog previously differed from English.
      `LanguageSheet.tsx` was `useStrings()`-converted back in run 10, so
      once a real overlay landed, its Cancel button started rendering the
      active locale's translation for real. The test file also had no
      `AsyncStorage.clear()` between its own cases, so a locale override
      set by an earlier case (`selecting a language applies the override`,
      which picks 'de') leaked into a later one, only becoming visible now
      that `de` has different text to leak in. Fixed both: added the clear
      (afterEach), and the Cancel assertion now reads
      `getCatalog('fr').common.cancel` (the file mocks the device to
      French and no override should be active in that case), matching what
      actually renders instead of assuming static English. This is the
      shape plan item 3 exists for, generalized: any test still asserting
      a literal English value for a section a later run translates will
      need the same fix when that run lands, not just this one file.

      New test file this run: `__tests__/localeCatalogs.test.ts`,
      parameterized (`describe.each`) across all 10 locale codes, covering
      what's specific to the overlay/merge machinery rather than any one
      locale's translation: every overlay key path exists in the English
      base (catches a typo'd/misnested key that would otherwise silently
      do nothing, since `mergeCatalog` only overlays what it's given), the
      `common.keep` guard above, and `getCatalog(locale)` resolving without
      throwing while keeping every top-level section (so an untranslated
      section is never dropped, only left in English). `__tests__/i18n.test.tsx`
      updated for the new merge behavior (no longer asserts `getCatalog('fr')
      is strings` by reference; asserts the translated slice, the
      English-fallback slice, memoization, and that the base catalog is
      never mutated).

      Three commits (infra + all 10 locale files in one, the
      languageSheet fix in a second, the orchestrator's owed
      PATTERN_VOCABULARY.md fix in a third after rebasing onto that
      review, which landed on origin mid-run); `tsc --noEmit` clean
      and the full suite green (113/113, 1210/1210, up from 112/1166,
      the 1 new suite and ~44 new tests all from this run) after each,
      no flake.

      **What's left:** expand each of the 10 overlays section by section
      (suggested order for the next dedicated run: `expenses`, `upcoming`,
      `categories`/`categoryDetail`, `settings`, `profile` next, since
      none of those touch the locked vocabulary or the app's quotes and
      are comparable in size to this run's slice; `habitLogging`,
      `coachMoments`, and `today`'s quote arrays need the DECISIONS NEEDED
      proposal below settled, or at minimum provisional entries adopted
      with a clear "pending Charen" marker, before translating). A
      dedicated run doing one language's full ~660 keys end to end (rather
      than one section across all 10) is also a reasonable alternative
      slicing; either way, budget more than one run per meaningful chunk,
      the same lesson item 2's file-by-file conversion learned repeatedly.

      **Run 21: second slice, `expenses`, `categories`, `categoryDetail`,
      `profile` populated for all 10 languages**, per run 20's suggested
      order. Deliberately stopped short of `settings` (the largest of the
      five, ~28 string keys) and `upcoming` this run, per the same
      "budget more than one run per chunk" guidance run 20 itself gave;
      `settings` is next.

      String-only keys translated: `expenses` 10 (all but the
      interpolated `editAccessibilityLabel`), `categories` 13 (all but
      the interpolated `deleteTitle`/`thisMonthSuffix`/
      `openCategoryLabel`), `categoryDetail` 10 (all but the interpolated
      `vsLastMonth`/`recentLogsCount`/`logTimestamp` and the pluralized
      `logCount`), `profile` 3 (all of it). 36 new string keys x 10
      languages, 53 of ~660 keys now populated per language (up from 17).
      Every function-valued key across these four sections was omitted
      and inherits English, same as run 20's design, whether or not it
      actually pluralizes: `logCount`'s ternary needs real ICU work, but
      the plain-interpolation functions (`editAccessibilityLabel`,
      `deleteTitle`, etc.) don't strictly need CLDR plural rules to
      translate. Kept them out anyway for one run more, so every function-
      valued key gets the same treatment until item 2's ICU checkbox
      actually lands and sets the pattern for both cases at once, rather
      than this routine deciding ad hoc per key which functions are "safe
      enough" to hand-translate now.

      `upcoming` has nothing to add: both its keys
      (`totalLabel`/`recurringCount`) are function-valued, and
      `recurringCount` is the ternary-plural case item 2's ICU work is
      itself waiting on, so this section stays fully English until that
      lands. Confirmed by reading the section, not assumed from run 20's
      note.

      One naming judgment call, flagged for the record rather than
      gated on: `categories.deleteCancel` ("Keep category", the Cancel
      button on the delete-confirm sheet) was translated normally in
      every language, not withheld like `common.keep`. Rationale: the
      withholding precedent is about a bare, context-free "Keep" that
      could plausibly land near the kept-money concept; "Keep category"
      is a full phrase whose own object (a category, not money) already
      disambiguates it from the locked `kept` term, so a normal verb
      translation (French `Conserver`, German `behalten`, etc, matching
      each language's already-established "kept ≠ saved, not an
      economize-verb" register from the DECISIONS NEEDED table, since
      using the same retain-verb keeps voice consistent even though this
      key isn't the locked term itself) reads as safe. Not a Charen-
      gating decision, just documented reasoning in case a future run or
      review wants to reconsider it.

      One transcription fix caught before committing, not shipped:
      the first Dutch draft of `categoryDetail.trendEmpty` read "Nog geen
      uitgaven om te grafiek weer te geven" (wrong preposition after "om
      te"); corrected to "Nog geen uitgaven om in een grafiek weer te
      geven" before writing the file. Also corrected `profile.title` for
      zh-Hans from an initially-drafted colloquial "我的" ("mine") to the
      more literal, safer-for-a-provisional-translation "个人资料"
      ("personal information/profile"), matching every other language's
      literal rendering rather than a locally idiomatic shortcut.

      No test file changes needed: `localeCatalogs.test.ts` is
      parameterized and schema-driven (it already covers any key an
      overlay adds), and no other test asserts literal English text for
      any of these four sections' keys (checked via the same
      `languageSheet.test.tsx`-shaped risk run 20 flagged; none found).
      One commit; `tsc --noEmit` clean and the full suite green
      (113/113, 1210/1210, same counts as run 20 since no new test
      file this run) after one re-run past the same pre-existing
      `door3BreakSheet.test.tsx` full-suite-load flake noted since run
      13 (failed once under full-suite load, passed standalone and on
      the immediate full-suite re-run, no code change in between; this
      run touched no Today-tree file).

      **Run 22: `settings` populated for all 10 languages**, the section
      deliberately deferred in run 21 (the largest of the originally
      suggested five, ~28 string keys). 28 string keys x 10 languages,
      81 of ~660 keys now populated per language (up from 53). Two keys
      excluded on purpose, per run 20's guidance: `versionValue` (a
      version number, e.g. "1.0.0") and `supportEmail` (an email
      address), neither is localizable content even though both are
      plain strings, not functions. The three function-valued keys in
      this section (`currencyRowLabel`, `languageRowLabel`,
      `versionFooter`) stay omitted and inherit English, same treatment
      as every other section in item 4. `upcoming` still has nothing to
      add (confirmed again; unchanged since run 21).

      This run's translated section directly overlaps the device-locale
      test fixture: hit and fixed a live instance of the exact
      test-isolation class run 20 first found (that run's own
      `languageSheet.test.tsx` fix, documented above and in HANDOFF.md's
      Notes). `settings.languageSystemDefault` now has a real French
      translation ("Système par défaut"), and two of that file's
      assertions (`'lists System default...'`,
      `'System default is selected...'`) still read the static English
      `strings.settings.languageSystemDefault` while `LanguageSheet`
      itself renders under the file's French-mocked device locale
      (`useStrings()`-converted since run 10). Both switched to
      `getCatalog('fr').settings.languageSystemDefault`, matching the
      file's own established pattern (its `cancel is the only centered
      action` test already did this for `common.cancel`). One commit
      (translations plus this fix, since the fix was required to keep
      the suite green after the translation, not a separate concern);
      `tsc --noEmit` clean and the full suite green (113/113, 1210/1210)
      on the first run, no flake.

      Lesson for future slices: any section containing a key rendered
      by a component whose test mocks a non-English device locale
      (`languageSheet.test.tsx`'s French mock is the only one of these
      so far) needs its own literal-English assertions checked against
      that mock, not just a section-wide grep for `strings.` in test
      files generally. `settings` was the first section translated
      since run 20's original fix to actually contain a key
      `LanguageSheet` itself reads (`languageSystemDefault`), which is
      why this recurred now rather than in run 21's four sections.
- [ ] leak / skip / kept / slip and the app's quotes are PRODUCT VOICE:
      never finalized by this routine. Provisional entries only, proposal
      table lives in HANDOFF.md's DECISIONS NEEDED until Charen picks.
      **Run 20: proposal table for the four locked terms added to
      HANDOFF.md's DECISIONS NEEDED**, ahead of translating the sections
      that contain them (`habitLogging` above all), so Charen's review can
      run in parallel with future runs' section-by-section translation
      work rather than gating it. The app's quotes (`today.spentQuotes`/
      `today.keptQuotes`) are NOT proposed: both arrays are RETIRED dead
      code (ADR 0037, nothing renders them since `ViewQuote.tsx`'s run-19
      decision), so translating them has no observable effect; deferred
      indefinitely, same reasoning as `ViewQuote` itself, unless ADR 0037
      is reversed.

## 5. Overflow hardening

- [ ] Audit long German/French strings on tight surfaces: Today chips,
      sheet headers, the category stat band. Fix truncation/wrapping, not
      the copy.

## 6. Localized accessibility labels

- [ ] `utils/a11y.ts` label helpers pull from the active catalog instead of
      hardcoded English.

## Explicitly out of scope

- Store listing metadata and screenshots (human work).
- RTL languages (a later batch).
- Finalizing leak/skip/kept/slip or quote translations (Charen's call).
