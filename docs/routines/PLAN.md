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
      not after. Converted so far (6 of ~67 remaining files):
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

      **`Sheet.tsx` still not converted, do its own run next**, same
      process as `ScreenHeader.tsx` just did: one usage
      (`accessibilityLabel={strings.common.close}`), imported by 13 sheet
      components across money/, habit-logging/, leak-scan/, settings/,
      onboarding/, plus `components/AddCategoryModal.tsx` and
      `app/habit/[id].tsx` directly. Build the deduplicated test-file list
      the same way (grep each importer's component name in `__tests__/`,
      watch for a route-level indirection like `LeakScanRoute` above, watch
      for a second `render()`/`rerender()` tree like `deckScreen.test.tsx`
      had), add `LocaleProvider` to that whole list in the same commit as
      the `Sheet.tsx` conversion, then run the full suite before committing.

      Remaining suggested order: continue picking genuinely small
      single-parent leaf files (re-run the leaf check above per candidate;
      do not assume shape from a file's name or its position in the list),
      then `Sheet.tsx` as its own run, then `CategoryTransactionsSheet.tsx`
      and its ResultsScreen-tree neighbors as one deliberate batch (by then
      `Sheet.tsx` will already be converted underneath them, so only their
      own `strings` usage remains), then the remaining sections' files, then
      the 13 `ScreenHeader` importers' and 13 `Sheet` importers' own
      `strings` usage as further leaf picks. Note for that later pass:
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
