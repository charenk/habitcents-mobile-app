# Localization routine: handoff

## Status

In progress. Plan item 2: `ScreenHeader.tsx` converted to `useStrings()` this
run (the first of the two flagged foundational components). `Sheet.tsx` is
next, same process. REVIEW FEEDBACK from the orchestrator (runs 1-4,
approved, no code fixes) landed mid-run and is addressed below; nothing
pending on it.

## Completed

- Plan item 1, full (earlier run): `expo-localization`, `utils/locale.ts`,
  `utils/storage.ts` override get/set, `contexts/LocaleContext.tsx`,
  Profile's Language row + `LanguageSheet` (cosmetic only, no catalog yet).
- Plan item 2, typed-API slice (earlier run): `utils/i18n.ts` (`Catalog`,
  `getCatalog`, `useStrings()`). No call sites touched that run.
- Plan item 2, call-site migration (earlier runs): converted 6 leaf files
  (`InfoRibbon`, `SettingsRow`, `WhereItWentCard`, `PaceCard`, `LeaksCard`,
  `ScanSnapshotCard`), plus measured (not converted) the `Sheet.tsx` /
  `ScreenHeader.tsx` blast radius.
- Plan item 2, `ScreenHeader.tsx` conversion (this run): its one `strings`
  usage (`accessibilityLabel={strings.common.back}`) now reads
  `const strings = useStrings();` inside the component. The 13 screens that
  render `ScreenHeader` still use the static `strings` import for their own
  text; only the header itself now goes through the catalog. That is
  deliberate scoping, not a shortcut: converting the shared component first
  and its callers later (as their own leaf picks) is smaller and safer than
  one big multi-file change.
- Test-side prerequisite, same commit: added `LocaleProvider` to all 16 test
  files that render `ScreenHeader`, directly or transitively, that did not
  already have it: `screenHeader`, `categoryDetailScreen`,
  `habitDetailPaywallPlacement`, `moneyUpcomingTab`,
  `moneyMaterializerIntegration`, `moneyHabitsTab`, `categoriesEmptyState`,
  `categoriesDeleteConfirm`, `scopeScreen`, `resultsScreenActivation`,
  `resultsScreenUndo`, `resultsScreenLadder`, `leakScanImportUndo`,
  `resultsScreenPaywallPlacement`, `deckScreen`, `leakScanOnboardingExit`.
  (5 of the 21 files that render a `ScreenHeader`-mounting screen already had
  `LocaleProvider` from earlier runs: `insightsFirstScan`, `door3BreakSheet`,
  `todaySpentKept`, `todayQuoteRibbonPlacement`, `door1FirstRun`, `profile`.)
  Two lessons from building this list, recorded in PLAN.md for the `Sheet.tsx`
  run to reuse: `deckScreen.test.tsx` has a second, separate provider tree at
  a `rerender()` call further down the file that is easy to miss; and
  `leakScanOnboardingExit.test.tsx` reaches `IntakeScreen`/`GracefulFailure`
  only transitively through `LeakScanRoute` (`@/app/leak-scan`), not a direct
  `<ComponentName` match, so it does not show up in the simple grep and has
  to be found by tracing the route file's own imports.
- `tsc --noEmit` clean, full suite run (not just touched files) 103/103
  suites, 1099/1099 tests green (unchanged count: no new tests this run,
  only test-provider wiring plus the one component's hook swap).

## Next

- `Sheet.tsx`: convert as its own full bounded run, same process
  `ScreenHeader.tsx` just used (build the deduplicated importer + test-file
  list first per PLAN.md item 2's exact steps, add `LocaleProvider` to the
  whole list in the same commit as the conversion, run the full suite before
  committing). PLAN.md has the importer list and both lessons above.
- Continue picking genuinely small single-parent leaf files for plan item 2
  in parallel with or after `Sheet.tsx` (re-run the leaf-verification grep
  per candidate every time).
- `CategoryTransactionsSheet.tsx` and its `ResultsScreen`-tree neighbors
  (`CategoryList.tsx`, `CategoryRow.tsx`, `TierBadge.tsx`, `KpiRow.tsx`,
  `HabitCard.tsx`, `ProjectionSection.tsx`, `ReviewQueueSheet.tsx`) come
  after `Sheet.tsx` is converted, as one deliberate batch.
- The 13 `ScreenHeader` importers' and 13 `Sheet` importers' own `strings`
  usage are themselves future leaf picks once the two shared components are
  done; `app/profile.tsx` is a special case among them (see Notes below).
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
  almost every component still reads the static English `strings` export and
  no non-English catalog exists. `ScreenHeader`'s back-button label is the
  first (and so far only) piece of on-screen text actually wired through
  `useStrings()`; it is still English text either way until plan item 4
  lands catalogs, so this is not yet observable. Expected, not a bug.
- Useful check before picking the next file to convert: a component is
  only a safe small leaf if (a) `grep -rl "<ComponentName" __tests__` finds
  few files, AND (b) every file that imports the component outside
  `__tests__/` mounts it conditionally, or is itself only reachable from a
  small test surface. Skipping check (b) is what made
  `CategoryTransactionsSheet.tsx` look smaller than it is. Also watch for
  false-positive matches on the component's own name inside a `/** ... */`
  doc comment cross-referencing another file (e.g. `HabitsList.tsx` and
  `HabitLeakRow.tsx` both mention "LeaksCard.tsx" in comments without
  importing it, and for a component reached only transitively through a
  route file's default export rather than a direct JSX match (the
  `leakScanOnboardingExit` case above); read the matched line, and trace
  route-level imports, before ruling a file out.
- `Sheet.tsx`: do not start converting without first building the
  deduplicated test-file list per PLAN.md item 2's process (now includes the
  two lessons from this run: the second-provider-tree case and the
  transitive-route case). Adding `LocaleProvider` to only some of the
  affected test files would leave the others exercising a component that
  now calls `useStrings()` outside a `LocaleProvider`, which throws.
- `app/profile.tsx` reads `strings.settings.supportEmail` at module scope
  (building `SUPPORT_MAILTO_URL` outside the component), so it is not a
  plain three-line hook swap like every leaf converted so far; note left in
  PLAN.md for whoever picks it.

## REVIEW FEEDBACK

2026-09-05, orchestrator, runs 1-4 reviewed (1d787c1..42bdbd5). Clean
foundation, approved with no code fixes: the pure matcher, the zh-Hant and
non-BR pt fallback-to-English choice, and the leaf-verification discipline
(including correcting the plan when CategoryTransactionsSheet turned out
bigger than assumed) are all right. Two coordination items for upcoming
runs, not fixes:

1. Incoming collisions from the other streams. routine/core-p3 adds new
   strings.ts sections (`shareCard`, `habitLogging.ceiling*`) plus two new
   files reading the static `strings` export (app/share-card.tsx,
   components/ShareCounterCard.tsx), and both routine/core-p3 and
   routine/ipad touch app/profile.tsx where your Language row sits; core
   also touches app/_layout.tsx (new Stack.Screen) next to your
   LocaleProvider hunk, and adds 3 dependencies to package.json where you
   add 1. Expect rebase conflicts in strings.ts (additive, different
   regions, trivial), profile.tsx, and the lockfile once those merge to
   main. On a package-lock.json conflict, regenerate it with npm install;
   never hand-merge it. Add core's new strings sections and both new files
   to the item 2 migration inventory when they land on main.
2. constants/strings.ts is the file the status board's conflict watch
   names as this stream's territory. The other streams' additive keys are
   legitimate; the collision risk lives in any structural reshaping of
   strings.ts this plan later needs (item 4's catalog work). Announce any
   structural strings.ts change in this HANDOFF one run before making it,
   so the board can warn the other streams in time.

**Addressed (this run, run 5):** this feedback landed on origin mid-run,
after this run's own code change (ScreenHeader.tsx) was already committed
locally; picked up via the rebase before push, no re-work needed since it
calls for no code fixes. Both items are noted for when they become live:
(1) no rebase conflict yet, since this run touched neither strings.ts nor
profile.tsx nor package.json; the item 2 migration inventory will pick up
core's new strings sections and its two new files once they land on main
and get their turn as leaf picks. (2) No structural strings.ts change made
or planned this run; item 4's catalog work is still several runs out, and
this note will get its one-run-ahead announcement here when that work
starts.
