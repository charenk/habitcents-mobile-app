/**
 * Locale foundation (routine/localization, plan item 1).
 *
 * LocaleCode is the app's own closed set: the base language plus the 10
 * languages this localization batch targets (no RTL languages in this
 * batch, ops CLAUDE.md style: sentence case, no em dashes). LOCALES is
 * display metadata for the language picker only (English name + native
 * name); it is not the app-string catalog, which lands in plan item 2.
 */

import { getLocales } from 'expo-localization';

export type LocaleCode =
  | 'en'
  | 'es'
  | 'fr'
  | 'de'
  | 'pt-BR'
  | 'it'
  | 'ja'
  | 'ko'
  | 'zh-Hans'
  | 'hi'
  | 'nl';

export type LocaleMeta = {
  code: LocaleCode;
  /** English name, for anyone reading this list in English. */
  englishName: string;
  /** The language's own name for itself, shown first in the picker. */
  nativeName: string;
};

export const LOCALES: LocaleMeta[] = [
  { code: 'en', englishName: 'English', nativeName: 'English' },
  { code: 'es', englishName: 'Spanish', nativeName: 'Español' },
  { code: 'fr', englishName: 'French', nativeName: 'Français' },
  { code: 'de', englishName: 'German', nativeName: 'Deutsch' },
  { code: 'pt-BR', englishName: 'Portuguese (Brazil)', nativeName: 'Português (Brasil)' },
  { code: 'it', englishName: 'Italian', nativeName: 'Italiano' },
  { code: 'ja', englishName: 'Japanese', nativeName: '日本語' },
  { code: 'ko', englishName: 'Korean', nativeName: '한국어' },
  { code: 'zh-Hans', englishName: 'Chinese (Simplified)', nativeName: '简体中文' },
  { code: 'hi', englishName: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'nl', englishName: 'Dutch', nativeName: 'Nederlands' },
];

export const DEFAULT_LOCALE: LocaleCode = 'en';

export function isLocaleCode(v: unknown): v is LocaleCode {
  return typeof v === 'string' && LOCALES.some((l) => l.code === v);
}

export function localeMeta(code: LocaleCode): LocaleMeta {
  return LOCALES.find((l) => l.code === code) ?? LOCALES[0];
}

/**
 * The shape expo-localization's getLocales() returns, narrowed to the
 * fields the matcher needs. Declared locally (rather than imported from
 * expo-localization) so matchDeviceLocale stays a pure function the tests
 * can call directly, with no native module to mock.
 */
export type DeviceLocale = {
  languageCode: string | null;
  languageScriptCode?: string | null;
  regionCode?: string | null;
};

/**
 * Maps one device locale entry to a supported LocaleCode, or null if this
 * batch does not cover it. Portuguese only ships pt-BR this batch, so any
 * pt variant resolves there. Chinese only ships Simplified; Traditional
 * (script Hant, or region TW/HK/MO) falls through to the next device
 * locale, or English, rather than mismatching to the wrong script.
 */
function matchOne(locale: DeviceLocale): LocaleCode | null {
  const lang = locale.languageCode?.toLowerCase() ?? null;
  if (!lang) return null;

  if (lang === 'zh') {
    const script = locale.languageScriptCode ?? null;
    const region = locale.regionCode?.toUpperCase() ?? null;
    if (script === 'Hant' || region === 'TW' || region === 'HK' || region === 'MO') return null;
    return 'zh-Hans';
  }

  if (lang === 'pt') return 'pt-BR';

  const direct: Partial<Record<string, LocaleCode>> = {
    en: 'en',
    es: 'es',
    fr: 'fr',
    de: 'de',
    it: 'it',
    ja: 'ja',
    ko: 'ko',
    hi: 'hi',
    nl: 'nl',
  };
  return direct[lang] ?? null;
}

/**
 * Picks the best supported LocaleCode from the device's ranked locale list
 * (expo-localization's getLocales(), most-preferred first), falling back to
 * DEFAULT_LOCALE when nothing in the list is covered by this batch.
 */
export function matchDeviceLocale(locales: DeviceLocale[]): LocaleCode {
  for (const locale of locales) {
    const matched = matchOne(locale);
    if (matched) return matched;
  }
  return DEFAULT_LOCALE;
}

/** Reads the device's current locale list and resolves it to a LocaleCode. */
export function detectDeviceLocale(): LocaleCode {
  return matchDeviceLocale(getLocales());
}
