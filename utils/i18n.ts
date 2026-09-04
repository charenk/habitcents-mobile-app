/**
 * Typed string-catalog API (routine/localization, plan item 2, first slice).
 *
 * `strings` in constants/strings.ts is the English catalog. `Catalog` is its
 * type, derived with `typeof` rather than hand-duplicated, so every section
 * (including the function-valued, pluralized ones) stays in sync as strings
 * are added or removed, with no separate type to maintain.
 *
 * getCatalog() is the seam plan item 4 fills with real per-locale catalogs;
 * every locale falls back to English until then, so call sites written
 * against useStrings() need no changes when that lands. Mirrors
 * useCurrency(): a component that reads the catalog reactively must sit
 * under LocaleProvider, and re-renders when the locale changes.
 *
 * Call sites migrate file by file (plan item 2's remaining work): replace
 * `import { strings } from '@/constants/strings'` with
 * `const strings = useStrings();` inside the component, keeping the local
 * name `strings` so every other line (`strings.expenses.recent`, etc.) is
 * unchanged. The static `strings` export keeps working for files not yet
 * migrated, so this lands with no behavior change.
 */

import { strings } from '@/constants/strings';
import { useLocale } from '@/contexts/LocaleContext';
import type { LocaleCode } from '@/utils/locale';

export type Catalog = typeof strings;

/**
 * The string catalog for a locale. Only English exists this run; every
 * locale resolves to it until plan item 4 lands provisional machine
 * translations, at which point this is the only function that changes.
 */
export function getCatalog(_locale: LocaleCode): Catalog {
  return strings;
}

/** Reactive string catalog for the active locale. */
export function useStrings(): Catalog {
  const { locale } = useLocale();
  return getCatalog(locale);
}
