# Localization routine: handoff

## Status

In progress. Plan item 2: converted the `ResultsScreen`-tree batch
(`CategoryTransactionsSheet` and 6 neighbors) plus `CategoryRow.tsx`, then a
second small slice (`BiggestLeakCard`, `ResultsFooter`, `QuestionCard`), all
this run. No REVIEW FEEDBACK pending from the orchestrator this run.

## Completed

- Plan item 1, full (earlier run): `expo-localization`, `utils/locale.ts`,
  `utils/storage.ts` override get/set, `contexts/LocaleContext.tsx`,
  Profile's Language row + `LanguageSheet` (cosmetic only, no catalog yet).
- Plan item 2, typed-API slice (earlier run): `utils/i18n.ts` (`Catalog`,
  `getCatalog`, `useStrings()`). No call sites touched that run.
- Plan item 2, call-site migration (earlier runs): converted 6 leaf files
  (`InfoRibbon`, `SettingsRow`, `WhereItWentCard`, `PaceCard`, `LeaksCard`,
  `ScanSnapshotCard`), then the 2 shared components `ScreenHeader.tsx` and
  `Sheet.tsx` (prior 2 runs, with `LocaleProvider` added to 16 then 10 test
  files respectively).
- Plan item 2, `ResultsScreen`-tree batch (this run): converted
  `CategoryTransactionsSheet.tsx` and its 6 neighbors (`CategoryList.tsx`,
  `TierBadge.tsx`, `KpiRow.tsx`, `HabitCard.tsx`, `ProjectionSection.tsx`,
  `ReviewQueueSheet.tsx`), plus `components/CategoryRow.tsx` (mounted under
  `app/(tabs)/categories.tsx`, same shape). All 8 are ordinary leaf
  components (their hooks only run when the parent actually renders them,
  unlike `Sheet.tsx`'s always-mounted case), and every screen that mounts
  them already had `LocaleProvider` from the `ScreenHeader.tsx`/`Sheet.tsx`
  runs, confirmed file by file before picking. No test file changes needed.
- Plan item 2, second slice (this run): converted `BiggestLeakCard.tsx`,
  `ResultsFooter.tsx`, `QuestionCard.tsx`. Same reasoning: `BiggestLeakCard`
  mounts from `ResultsScreen.tsx` and `DeckScreen.tsx` (both covered,
  `deckScreen`'s two render trees re-checked); `ResultsFooter` is
  `ResultsScreen`-only; `QuestionCard` mounts only from `IntakeScreen.tsx`,
  which has no dedicated test coverage today (confirmed by grep), so
  nothing to update either way. No test file changes needed.
- Found and deferred (not converted): `SpendPulse.tsx` builds a
  `GRANULARITY_OPTIONS` array from `strings.leakScan.pulseGranularity*` at
  module scope, the same shape as `app/profile.tsx`'s flagged
  `SUPPORT_MAILTO_URL` case; neither is a plain hook swap, both need the
  `strings` read moved inside the component. Left for a dedicated future
  pick, noted in PLAN.md.
- `tsc --noEmit` clean, full suite run (not just touched files) both times
  this run: 105/105 suites, 1125/1125 tests green (count includes other
  streams' merges pulled in by this run's rebase, not new tests).

## Next

- Continue picking genuinely small single-parent leaf files (re-run the
  leaf-verification grep per candidate every time; for components whose
  parent screen already renders `ScreenHeader` or `Sheet`, check whether
  that parent's test files already carry `LocaleProvider` before assuming a
  fresh test-file list is needed; watch for the module-scope
  `strings.xxx` pattern found in `SpendPulse.tsx` before assuming any file
  is a quick swap).
- `SpendPulse.tsx` and `app/profile.tsx` as their own picks: both need the
  `strings` read moved inside the component (most likely into a `useMemo`
  alongside their existing `styles`), not a plain three-line hook swap.
- The 13 `ScreenHeader` importers' and 13 `Sheet` importers' own `strings`
  usage are themselves future leaf picks once the two shared components are
  done.
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
  most components still read the static English `strings` export and no
  non-English catalog exists. 19 files (2 shared, 17 leaves) are wired
  through `useStrings()` so far; all still resolve to English either way
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
