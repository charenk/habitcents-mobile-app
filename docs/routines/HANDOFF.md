# Localization routine: handoff

## Status

In progress. Plan item 1 (device locale + language override foundation) is
done. Plan item 2's typed-API design is done and landed with no call sites
touched; the remaining, larger part of item 2 is migrating call sites file
by file, starting next run.

## Completed

- Plan item 1, full (prior run): `expo-localization`, `utils/locale.ts`,
  `utils/storage.ts` override get/set, `contexts/LocaleContext.tsx`,
  Profile's Language row + `LanguageSheet` (cosmetic only, no catalog yet).
- Plan item 2, typed-API slice (this run): `utils/i18n.ts` adds `Catalog`
  (`typeof strings`), `getCatalog(locale)` (every locale resolves to the
  English catalog for now; the seam item 4 fills in), and `useStrings()`
  (reads `useLocale()`, mirrors `useCurrency()`, re-resolves on locale
  change). `constants/strings.ts` itself is untouched: still the English
  catalog, still exported as `strings`. No component was migrated to
  `useStrings()` this run (see below for why), so this is a purely additive
  change with zero behavior difference. Tests: `__tests__/i18n.test.tsx`
  (4 tests: getCatalog resolution, useStrings throws outside
  LocaleProvider same as useLocale, resolves under it, re-resolves when the
  override changes).
- tsc clean, 102 suites / 1093 tests passing (up from 101 / 1089 baseline).
  One test (`door3BreakSheet.test.tsx`'s first case) timed out once under
  full-suite load; reran clean in isolation (17/17) and reran clean in the
  full suite a second time. Pre-existing flake, unrelated to this run's
  diff (that file's own strings usage is `common`/`habitLogging`/`sheets`
  via the static export, nothing this run touched).

## Next

- Call-site migration (plan item 2, the big remaining piece): convert files
  from `import { strings } from '@/constants/strings'` to
  `const strings = useStrings();` inside the component, one file (or a
  small same-shape batch) at a time. Keep the local name `strings` so the
  rest of each file's body needs no change.
- Why no component was converted this run: `useStrings()` throws outside
  `LocaleProvider` (matching `useLocale()`/`useCurrency()`), and this
  codebase's test convention is a per-test-file local `Providers` wrapper
  (no shared render helper), so every test that renders a migrated
  component needs `LocaleProvider` added to its own wrapper. That is fine
  and expected (`CurrencyProvider` rolled out the same way), but
  `components/ui/Sheet.tsx` and `components/ui/ScreenHeader.tsx` are used
  by most of the app's sheets and every tab screen, so converting either
  first would mean touching dozens of test files in one run, which does
  not fit a bounded increment. Do the leaf, single-section files first
  (`components/onboarding/FirstRunRibbon.tsx`,
  `components/leak-scan/CategoryTransactionsSheet.tsx` are the smallest
  `common`-only candidates; each still touches a couple of tests, check
  before starting) to prove the pattern on real components before taking on
  the two foundational ones and their much larger test blast radius.
- After a decent slice of files is migrated, plan item 3 (test migration
  away from literal-English assertions) can start for those files.

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
  no component reads through `useStrings()` and no non-English catalog
  exists. Expected until call-site migration (item 2) and provisional
  translations (item 4) land; not a bug.
