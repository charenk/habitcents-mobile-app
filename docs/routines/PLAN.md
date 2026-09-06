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
- [ ] Call-site migration, file by file: replace
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

      Remaining suggested order: continue picking genuinely small
      single-parent leaf files (re-run the leaf check above per candidate;
      do not assume shape from a file's name or its position in the list;
      watch for the module-scope patterns above, both the array shape and
      the helper-function shape, and check which one applies before
      estimating cost). Good next candidates already scoped:
      `components/habit-logging/WeekStrip.tsx` (imported only by the now-
      converted `CheckInCard.tsx`, so likely covered by the same three test
      files, re-check before assuming) and
      `components/habit-logging/useCheckInFeedback.ts` (a hook, name starts
      with `use`, so it can call `useStrings()` directly like a component;
      confirm its call sites and test coverage before converting). Then
      `SpendPulse.tsx`, `LongArc.tsx`, and `app/profile.tsx` as their own
      picks (all three need the strings read moved inside the component,
      not a plain hook swap, and `LongArc.tsx` now confirmed same shape as
      `SpendPulse.tsx`), then the remaining sections' files, then the 13
      `ScreenHeader` importers' and remaining `Sheet` importers' own
      `strings` usage as further leaf picks (for these, re-run the same
      "does the parent screen already carry `LocaleProvider` for a shared-
      component reason" check before assuming a fresh test-file list is
      needed; also check for the module-scope function pattern, found twice
      now in this importer set). Note for that later pass:
      `utils/coachMoments.ts`, `utils/recurring.ts`, and
      `contexts/ReportsContext.tsx` import `strings` but are not simple
      hook-eligible leaves (`coachMoments.ts` and `recurring.ts` are plain
      functions, not components or hooks, so they cannot call
      `useStrings()` directly; they need the catalog passed in as a
      parameter instead, decide the shape when their turn comes). Also note:
      `app/profile.tsx` reads `strings.settings.supportEmail` at module
      scope (`const SUPPORT_MAILTO_URL = ...`, outside any component), so
      its own conversion cannot be the same three-line hook swap as every
      leaf so far; that module-level read needs to move inside the
      component (or another shape) when profile.tsx's turn comes.
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
- [ ] leak / skip / kept / slip and the app's quotes are PRODUCT VOICE:
      never finalized by this routine. Provisional entries only, proposal
      table lives in HANDOFF.md's DECISIONS NEEDED until Charen picks.

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
