# Localization routine: handoff

## Status

In progress. Plan item 2's call-site migration continues: 3 more files
converted this run (6 of ~67 total), plus the `Sheet.tsx` / `ScreenHeader.tsx`
blast radius is now measured and documented in PLAN.md ahead of converting
them. No REVIEW FEEDBACK pending.

## Completed

- Plan item 1, full (earlier run): `expo-localization`, `utils/locale.ts`,
  `utils/storage.ts` override get/set, `contexts/LocaleContext.tsx`,
  Profile's Language row + `LanguageSheet` (cosmetic only, no catalog yet).
- Plan item 2, typed-API slice (earlier run): `utils/i18n.ts` (`Catalog`,
  `getCatalog`, `useStrings()`). No call sites touched that run.
- Plan item 2, call-site migration (earlier run): converted
  `components/ui/InfoRibbon.tsx`, `components/settings/SettingsRow.tsx`,
  `components/insights/WhereItWentCard.tsx`, with `LocaleProvider` added to
  the 6 test files that needed it.
- Plan item 2, call-site migration (this run): converted 3 more files, all
  verified as safe leaves before touching them (same technique as before:
  grep the component in `__tests__/`, then grep its real importers outside
  `__tests__/`, watching for comment-only false-positive hits):
  `components/insights/PaceCard.tsx`, `components/insights/LeaksCard.tsx`,
  `components/insights/ScanSnapshotCard.tsx`. All three are conditionally
  mounted from the same single parent, `app/(tabs)/insights.tsx` (behind
  `view === 'scan'` / `monthHasData`), and the only two test files that
  actually render that screen tree, `__tests__/emptyStateSurfaces.test.tsx`
  and `__tests__/insightsFirstScan.test.tsx`, already had `LocaleProvider`
  wired in from a prior run, so this run needed no test file changes at
  all, just the 3 component edits (`import { strings } from
  '@/constants/strings'` to `import { useStrings } from '@/utils/i18n'` plus
  `const strings = useStrings();` inside the component).
- Measured (not converted) the `Sheet.tsx` / `ScreenHeader.tsx` blast radius
  this run, per the prior run's flag that it needed scoping before starting.
  Full findings are in PLAN.md item 2. Summary: both are genuinely large.
  `ScreenHeader.tsx` is imported by 13 files (nearly every top-level
  screen); `Sheet.tsx` by 13 sheet components. Of the 91
  `__tests__/*.test.tsx` files, only 10 currently have `LocaleProvider`
  wired in; the other 53 do not, and most of them render something that
  touches one of these two files. Confirmed this deserves its own full run
  per file (`ScreenHeader.tsx` first, then `Sheet.tsx`), not a slice
  alongside other leaf conversions.
- tsc clean, 103 suites / 1099 tests passing (unchanged count from last
  run's baseline; this run only touched imports/hook calls inside existing
  components, added no new tests).

## Next

- Continue picking genuinely small single-parent leaf files for plan item 2
  (re-run the leaf-verification grep per candidate every time; do not
  assume a file's shape from its name or its position in a list, per the
  `CategoryTransactionsSheet.tsx` lesson from two runs ago).
- `components/ui/ScreenHeader.tsx`: convert as its own full bounded run.
  PLAN.md item 2 has the exact importer list and the LocaleProvider-adding
  process to follow (build the deduplicated test-file list first, add
  `LocaleProvider` to all of them in the same commit as the conversion,
  then run the full suite).
- `components/ui/Sheet.tsx`: same treatment, its own run, after
  `ScreenHeader.tsx`.
- `CategoryTransactionsSheet.tsx` and its `ResultsScreen`-tree neighbors
  (`CategoryList.tsx`, `CategoryRow.tsx`, `TierBadge.tsx`, `KpiRow.tsx`,
  `HabitCard.tsx`, `ProjectionSection.tsx`, `ReviewQueueSheet.tsx`) come
  after `Sheet.tsx` is converted, as one deliberate batch (they share the
  same 7+ test files needing `LocaleProvider`, and by then `Sheet.tsx`
  underneath them will already be converted).
- `utils/coachMoments.ts`, `utils/recurring.ts` are plain functions (not
  components or hooks) that import `strings`; they cannot call
  `useStrings()` directly and need the catalog passed in as a parameter
  instead. Decide that shape when their turn comes; noted in PLAN.md so it
  is not mistaken for a normal leaf conversion.
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
  non-English catalog exists. Expected until call-site migration (item 2)
  and provisional translations (item 4) land further; not a bug.
- Useful check before picking the next file to convert: a component is
  only a safe small leaf if (a) `grep -rl "<ComponentName" __tests__` finds
  few files, AND (b) every file that imports the component outside
  `__tests__/` mounts it conditionally, or is itself only reachable from a
  small test surface. Skipping check (b) is what made
  `CategoryTransactionsSheet.tsx` look smaller than it is. Also watch for
  false-positive matches on the component's own name inside a `/** ... */`
  doc comment cross-referencing another file (e.g. `HabitsList.tsx` and
  `HabitLeakRow.tsx` both mention "LeaksCard.tsx" in comments without
  importing it); read the matched line before counting it as a real
  importer.
- `Sheet.tsx` / `ScreenHeader.tsx`: do not start converting either without
  first building the deduplicated test-file list per PLAN.md item 2's
  process. Adding `LocaleProvider` to only some of the affected test files
  would leave the others exercising a component that now calls
  `useStrings()` outside a `LocaleProvider`, which throws.

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
