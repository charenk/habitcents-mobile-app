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

- [ ] Design the typed API: call sites should barely change
      (`strings.expenses.recent` style stays, or a thin `t()` wrapper with
      the same shape) while the values become locale-aware.
- [ ] Convert `constants/strings.ts` into an English catalog under the new
      API. Function-valued strings (pluralized/interpolated) become ICU
      messages with proper CLDR plural rules, not the current hand-rolled
      `n === 1 ? '' : 's'` ternaries.
- [ ] Add the ICU formatting dependency this needs (`i18n-js` or
      alternative) at this point, once its actual usage is known.
- [ ] `strings` resolves against the active `LocaleContext` locale, English
      fallback for any missing key in a provisional catalog.

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
