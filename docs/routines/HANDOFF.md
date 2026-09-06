# Localization routine: handoff

## Status

In progress. Plan item 2: converted 9 more leaf files this run
(`EventHistory.tsx`, `HistoryCalendar.tsx`, `CheckInCard.tsx`,
`LeakCard.tsx`, `KeptHero.tsx`, `PartialSlipSheet.tsx`, `PickOneSheet.tsx`,
`SpentKeptChips.tsx`, `HabitLeakRow.tsx`), across 4 commits. No REVIEW
FEEDBACK pending from the orchestrator this run.

## Completed

- Plan item 1, full (earlier run): `expo-localization`, `utils/locale.ts`,
  `utils/storage.ts` override get/set, `contexts/LocaleContext.tsx`,
  Profile's Language row + `LanguageSheet` (cosmetic only, no catalog yet).
- Plan item 2, typed-API slice (earlier run): `utils/i18n.ts` (`Catalog`,
  `getCatalog`, `useStrings()`). No call sites touched that run.
- Plan item 2, call-site migration (earlier runs): converted 6 leaf files
  (`InfoRibbon`, `SettingsRow`, `WhereItWentCard`, `PaceCard`, `LeaksCard`,
  `ScanSnapshotCard`), then the 2 shared components `ScreenHeader.tsx` and
  `Sheet.tsx`, then the `ResultsScreen`-tree batch (`CategoryTransactionsSheet`
  and 6 neighbors, plus `CategoryRow.tsx`), then a second slice
  (`BiggestLeakCard`, `ResultsFooter`, `QuestionCard`). 22 files total before
  this run.
- Plan item 2, this run (4 commits): converted `EventHistory.tsx` and
  `HistoryCalendar.tsx` (both `habit/[id].tsx`-only, already covered by
  `habitDetailPaywallPlacement.test.tsx`, no test changes); `CheckInCard.tsx`,
  `LeakCard.tsx`, `KeptHero.tsx` (share 3 leaf-only test files -
  `checkInCardAnnounce`, `renderedA11y`, `dynamicType` - all missing
  `LocaleProvider`, added; `KeptHero` is also mounted by `PayoffScreen.tsx`,
  so `payoffScreen.test.tsx` needed it too, caught by the full-suite run, not
  the importer grep); `PartialSlipSheet.tsx`, `PickOneSheet.tsx` (both
  `Sheet.tsx` importers already covered by that run's test files, no test
  changes); `SpentKeptChips.tsx` (Today-only, leaf-only `tabGeometry.test.tsx`
  needed `LocaleProvider`); `HabitLeakRow.tsx` (importers already covered via
  `HabitsList`/`LeaksCard`, leaf-only `habitLeakRow.test.tsx` needed it).
  31 files converted total now (2 shared components + 29 leaves).
- Found a second module-scope shape this run, smaller than `SpendPulse.tsx`'s:
  `CheckInCard.tsx`'s `chapterCopy`/`confirmationCopy` and `PickOneSheet.tsx`'s
  `cadenceLabel` are module-level *helper functions* (not module-level
  *arrays*) reading the static `strings` import directly. Fixed by adding a
  `strings: Catalog` parameter and threading it from `useStrings()` at each
  call site, not by restructuring into the render body. Full detail and the
  distinction from the array shape in PLAN.md.
- Found and deferred (not converted): `LongArc.tsx` has the same module-scope
  *array* shape as `SpendPulse.tsx` (a `CHAPTERS` array built from
  `strings.habitLogging.chapterXxx` at module scope). Grouped with
  `SpendPulse.tsx` and `app/profile.tsx` for a future dedicated pick.
- `tsc --noEmit` clean and full suite run (not just touched files) after
  every one of this run's 4 commits: 105/105 suites, 1125/1125 tests green
  throughout.

## Next

- Good next candidates already scoped: `components/habit-logging/WeekStrip.tsx`
  (imported only by the now-converted `CheckInCard.tsx`) and
  `components/habit-logging/useCheckInFeedback.ts` (a hook, can call
  `useStrings()` directly; confirm call sites and test coverage first).
- Continue picking genuinely small single-parent leaf files after those (re-run
  the leaf-verification grep per candidate every time; check for both
  module-scope shapes - the array shape in `SpendPulse.tsx`/`LongArc.tsx` and
  the helper-function shape in `CheckInCard.tsx`/`PickOneSheet.tsx` - before
  assuming a file's cost).
- `SpendPulse.tsx`, `LongArc.tsx`, `app/profile.tsx` as their own picks: all
  three need the strings read moved inside the component (most likely into a
  `useMemo` alongside their existing `styles`), not a plain hook swap.
- The 13 `ScreenHeader` importers' and remaining `Sheet` importers' own
  `strings` usage are themselves future leaf picks once the two shared
  components are done (2 of the 13 `Sheet` importers, `PartialSlipSheet` and
  `PickOneSheet`, are now done as of this run).
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
  non-English catalog exists. 31 files (2 shared, 29 leaves) are wired
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
  This run added a wrinkle: even when a component is already converted
  (`KeptHero.tsx`), a *new* leaf you are converting today may be mounted
  from somewhere that component's own test-file list did not cover
  (`PayoffScreen.tsx`, which `KeptHero.tsx` also renders into but which is
  not itself converted yet) - grep every importer fresh for each file you
  convert, do not reuse an old importer list, and always let the full-suite
  run be the final check, not just the grep.
- Also watch for false-positive matches on a component's own name inside a
  `/** ... */` doc comment cross-referencing another file; read the matched
  line, and trace route-level imports, before ruling a file in or out.
- Two module-scope shapes now confirmed among files still importing static
  `strings`, costed very differently: a module-level *array* built from
  `strings.xxx` (`SpendPulse.tsx`, `LongArc.tsx`) needs restructuring into
  the render body; a module-level *helper function* that reads `strings`
  directly (`CheckInCard.tsx`'s `chapterCopy`/`confirmationCopy`,
  `PickOneSheet.tsx`'s `cadenceLabel`) just needs a `strings: Catalog`
  parameter added and threaded from the caller's `useStrings()`, a much
  smaller fix. Check which shape a flagged file has before estimating it.
- `app/profile.tsx` reads `strings.settings.supportEmail` at module scope
  (building `SUPPORT_MAILTO_URL` outside the component), so it is not a
  plain three-line hook swap like every leaf converted so far; note left in
  PLAN.md for whoever picks it.
- 2026-09-06, out-of-band CI fix (not a scheduled run, a reaction to a
  check_run.completed failure notification on PR #134): main added 3 new
  test files (`moneyPager.test.tsx`, `scanSnapshotFooter.test.tsx`,
  `insightsPager.test.tsx`, all 2026-09-06) that render `ScreenHeader`
  and/or `ScanSnapshotCard`, both already converted to `useStrings()` on
  this branch, but their provider wrappers predate `LocaleProvider` (they
  were written directly on main, which has none of this routine's work).
  These only surfaced once this branch rebased onto that main commit; the
  raw branch build was fine, only the PR's merge-preview against main was
  red. Fixed by rebasing onto latest main, then adding `LocaleProvider` +
  the standard `expo-localization` mock to all three files, same pattern
  as every other test file this routine has touched. No production code
  changed. This is a standing risk for the rest of plan item 2: any new
  test file landing on main for an already-converted shared component
  (`ScreenHeader`, `Sheet`) will fail the same way until this branch
  rebases and picks it up. Re-run `tsc` + the full suite after every
  rebase, not just after this routine's own commits, to catch it early.

2026-09-06, orchestrator, runs 5-8 reviewed (ScreenHeader and Sheet
conversions, the ResultsScreen-tree batch, and the run 8 slices through
HabitLeakRow). The migration discipline holds: the trace-to-real-mount-site
process on Sheet's untested importers was exactly right, and passing the
catalog as a parameter to module-scope helpers (chapterCopy,
confirmationCopy, cadenceLabel) is the correct shape for that pattern. One
code fix and two rebase items:

1. Fix next run: `components/habit-logging/CheckInCard.tsx`. The `coach`
   useMemo (around line 169) now reads `strings` (milestoneHeadline + chapterCopy) but
   `strings` is not in its dependency array, so a locale switch while a
   coach headline is showing keeps the old-language headline. Harmless
   today (every locale falls back to English) but it is exactly the latent
   class this migration must not seed. Add `strings` to the deps. I swept
   every other converted file for hooks reading `strings` with stale deps;
   this is the only instance. Going forward, when a conversion touches a
   useMemo/useCallback body, add `strings` to its deps in the same edit.
2. Rebase alert: main moved after your run 8 (PRs #142-#146, the
   navigation and leak-finder-teaser wave). `constants/strings.ts` gained
   ~59 lines of teaser strings on main (the long-predicted collision, now
   real), and `components/insights/ScanSnapshotCard.tsx`, which you
   converted in run 4, was substantially rewritten on main. After
   rebasing, re-verify ScanSnapshotCard still compiles through
   useStrings() and that main's new strings additions sit in the catalog
   type cleanly. `__tests__/insightsFirstScan.test.tsx` and
   `__tests__/leakScanOnboardingExit.test.tsx` changed on both sides
   (your LocaleProvider wiring vs main's SCAN_FLOW_ENABLED gate mocks);
   keep both.
3. Context, no action: main wrapped the leak finder as coming soon
   (SCAN_FLOW_ENABLED gate, #142/#145). The scan-flow components you
   migrated stay compiled and tested, so the work stands; just do not
   prioritize further leak-scan-tree conversions over live surfaces if
   ordering ever forces a choice.
