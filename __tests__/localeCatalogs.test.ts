/**
 * Locale overlay content guards (plan item 4). One test per concern,
 * parameterized across all 10 target locales, so a new locale or a widened
 * overlay slice is covered automatically without a new test file:
 *
 * - schema drift: every key path an overlay supplies must exist in the
 *   English base catalog, catching a typo'd or misnested key before it
 *   silently does nothing (mergeCatalog only overlays keys it is given;
 *   an extra key on the overlay object is invisible at runtime, so this
 *   is the only thing that would ever catch it).
 * - the locked-vocabulary guard: no overlay may translate `common.keep`
 *   until Charen picks a translation (see HANDOFF.md's DECISIONS NEEDED).
 * - getCatalog(locale) never throws and always returns the base catalog's
 *   full top-level key set (mergeCatalog must never drop an untranslated
 *   section).
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import { strings } from '@/constants/strings';
import { getCatalog } from '@/utils/i18n';
import { LOCALES, type LocaleCode } from '@/utils/locale';
import { es } from '@/locales/es';
import { fr } from '@/locales/fr';
import { de } from '@/locales/de';
import { ptBR } from '@/locales/pt-BR';
import { it as itOverlay } from '@/locales/it';
import { ja } from '@/locales/ja';
import { ko } from '@/locales/ko';
import { zhHans } from '@/locales/zh-Hans';
import { hi } from '@/locales/hi';
import { nl } from '@/locales/nl';

const OVERLAYS: Record<Exclude<LocaleCode, 'en'>, object> = {
  es,
  fr,
  de,
  'pt-BR': ptBR,
  it: itOverlay,
  ja,
  ko,
  'zh-Hans': zhHans,
  hi,
  nl,
};

const TARGET_LOCALES = LOCALES.map((l) => l.code).filter(
  (code): code is Exclude<LocaleCode, 'en'> => code !== 'en'
);

/** Recursively confirms every key path in `overlay` also exists in `base`. */
function assertKeysExistInBase(base: unknown, overlay: unknown, path: string): void {
  if (typeof overlay !== 'object' || overlay === null || Array.isArray(overlay)) return;
  const baseRecord = base as Record<string, unknown> | null;
  for (const key of Object.keys(overlay as Record<string, unknown>)) {
    const fullPath = path ? `${path}.${key}` : key;
    expect(baseRecord).not.toBeNull();
    expect(baseRecord).toHaveProperty(key);
    assertKeysExistInBase(
      baseRecord?.[key],
      (overlay as Record<string, unknown>)[key],
      fullPath
    );
  }
}

describe.each(TARGET_LOCALES)('locale overlay: %s', (code) => {
  const overlay = OVERLAYS[code];

  it('only supplies keys that exist in the English base catalog', () => {
    assertKeysExistInBase(strings, overlay, '');
  });

  it('does not translate the locked-vocabulary common.keep key', () => {
    const overlayCommon = (overlay as { common?: { keep?: unknown } }).common;
    expect(overlayCommon?.keep).toBeUndefined();
  });

  it('resolves through getCatalog without throwing, keeping every top-level section', () => {
    const catalog = getCatalog(code);
    expect(Object.keys(catalog).sort()).toEqual(Object.keys(strings).sort());
  });

  it('leaves common.keep resolved to the English value', () => {
    expect(getCatalog(code).common.keep).toBe(strings.common.keep);
  });
});
