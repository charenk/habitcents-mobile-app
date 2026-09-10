/**
 * Typed string-catalog API (routine/localization, plan item 2, first slice;
 * plan item 4 added the overlay/merge machinery below).
 *
 * `strings` in constants/strings.ts is the English catalog. `Catalog` is its
 * type, derived with `typeof` rather than hand-duplicated, so every section
 * (including the function-valued, pluralized ones) stays in sync as strings
 * are added or removed, with no separate type to maintain.
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
import { DEFAULT_LOCALE, type LocaleCode } from '@/utils/locale';
import { es } from '@/locales/es';
import { fr } from '@/locales/fr';
import { de } from '@/locales/de';
import { ptBR } from '@/locales/pt-BR';
import { it } from '@/locales/it';
import { ja } from '@/locales/ja';
import { ko } from '@/locales/ko';
import { zhHans } from '@/locales/zh-Hans';
import { hi } from '@/locales/hi';
import { nl } from '@/locales/nl';

export type Catalog = typeof strings;

/**
 * A locale's translated slice of the catalog. Every leaf is optional at
 * every level (deep partial), so a locale file only needs to supply the
 * sections it has translated so far; every untranslated leaf falls back to
 * English via mergeCatalog(). Function-valued entries (pluralized/
 * interpolated strings) are NOT deep-partialed into their own parameters:
 * an overlay either supplies the whole function (its own locale-appropriate
 * pluralization) or omits the key entirely and inherits the English one.
 */
export type LocaleOverlay = DeepPartialCatalog<Catalog>;

// constants/strings.ts is declared `as const`, so Catalog's leaves are
// string LITERAL types ("Save", not string) and its plain arrays are
// readonly literal tuples. A translation is a different literal, so every
// leaf and array element widens to the general primitive/element type
// here; only function signatures (already general, not literal, since
// `as const` does not narrow a function's own return type the way it
// narrows a plain string) pass through unchanged.
//
// Array elements use WidenLiterals, not a recursive DeepPartialCatalog,
// because mergeCatalog() replaces an overlaid array wholesale rather than
// merging element by element (see its own comment below): a
// DeepPartialCatalog<U>[] element type would let an overlay legally supply
// an object-element array missing a required field (e.g. a future
// `TodayQuote[]` overlay omitting `text`), which tsc would accept and the
// merge would render as `undefined` at runtime with no type error to catch
// it (2026-09-10 orchestrator review). WidenLiterals keeps every element
// key's own required/optional shape from the base type intact and only
// widens literal types, so an overlay array must supply every required
// field on every element, same as constructing one directly.
type DeepPartialCatalog<T> = T extends (...args: never[]) => unknown
  ? T
  : T extends readonly (infer U)[]
  ? WidenLiterals<U>[]
  : T extends object
  ? { [K in keyof T]?: DeepPartialCatalog<T[K]> }
  : T extends string
  ? string
  : T;

type WidenLiterals<T> = T extends (...args: never[]) => unknown
  ? T
  : T extends readonly (infer U)[]
  ? WidenLiterals<U>[]
  : T extends object
  ? { [K in keyof T]: WidenLiterals<T[K]> }
  : T extends string
  ? string
  : T;

/**
 * Recursively overlays `overlay` onto `base`, key by key. A nested plain
 * object recurses (so a locale can translate `common.save` without
 * supplying every other `common.*` key); a function, array, or primitive in
 * the overlay fully replaces the base value (no partial functions, no
 * merged arrays: today.exampleSkips, if a locale ever translates it, is
 * the whole rotated list or nothing). Never mutates `base`.
 */
function mergeCatalog<T>(base: T, overlay: DeepPartialCatalog<T> | undefined): T {
  if (overlay === undefined) return base;
  if (
    typeof base === 'object' &&
    base !== null &&
    !Array.isArray(base) &&
    typeof overlay === 'object' &&
    overlay !== null &&
    !Array.isArray(overlay)
  ) {
    const result = { ...base } as Record<string, unknown>;
    const overlayRecord = overlay as Record<string, unknown>;
    for (const key of Object.keys(overlayRecord)) {
      result[key] = mergeCatalog(
        (base as Record<string, unknown>)[key],
        overlayRecord[key] as DeepPartialCatalog<unknown> | undefined
      );
    }
    return result as T;
  }
  // Function, array, or primitive: the overlay's value replaces the base's
  // wholesale, not merged.
  return overlay as unknown as T;
}

/**
 * Registry of every locale's provisional overlay (plan item 4). A locale
 * absent here, or a key absent from its overlay, resolves to English.
 * Filled in incrementally, section by section, run by run; see each
 * locales/<code>.ts file's own header for what it covers so far.
 */
const OVERLAYS: Partial<Record<LocaleCode, LocaleOverlay>> = {
  es,
  fr,
  de,
  'pt-BR': ptBR,
  it,
  ja,
  ko,
  'zh-Hans': zhHans,
  hi,
  nl,
};

// getCatalog() is called on every render via useStrings(); memoizing per
// locale keeps the returned object referentially stable across calls, so a
// useMemo/useCallback that lists `strings` in its deps does not recompute
// every render just because getCatalog built a fresh merged object each
// time. The cache is a plain module-level Map: catalogs never change at
// runtime (only which locale is active does), so there is nothing to
// invalidate.
const catalogCache = new Map<LocaleCode, Catalog>();

/**
 * The string catalog for a locale: the English base with that locale's
 * overlay (if any) merged on top, so an untranslated key always falls back
 * to English rather than rendering blank or throwing. `en` always returns
 * `strings` itself (no overlay, no merge, same reference every call).
 */
export function getCatalog(locale: LocaleCode): Catalog {
  if (locale === DEFAULT_LOCALE) return strings;
  const cached = catalogCache.get(locale);
  if (cached) return cached;
  const overlay = OVERLAYS[locale];
  const resolved = overlay ? mergeCatalog(strings, overlay) : strings;
  catalogCache.set(locale, resolved);
  return resolved;
}

/** Reactive string catalog for the active locale. */
export function useStrings(): Catalog {
  const { locale } = useLocale();
  return getCatalog(locale);
}
