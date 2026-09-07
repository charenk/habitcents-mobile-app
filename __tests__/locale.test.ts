import {
  DEFAULT_LOCALE,
  LOCALES,
  isLocaleCode,
  localeMeta,
  matchDeviceLocale,
} from '@/utils/locale';

describe('LOCALES metadata', () => {
  it('includes English plus the 10 batch languages, no duplicates', () => {
    expect(LOCALES).toHaveLength(11);
    const codes = LOCALES.map((l) => l.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('validates locale codes', () => {
    expect(isLocaleCode('en')).toBe(true);
    expect(isLocaleCode('pt-BR')).toBe(true);
    expect(isLocaleCode('pt')).toBe(false);
    expect(isLocaleCode('zh-Hant')).toBe(false);
    expect(isLocaleCode(null)).toBe(false);
    expect(isLocaleCode(42)).toBe(false);
  });

  it('DEFAULT_LOCALE is a valid, English code', () => {
    expect(isLocaleCode(DEFAULT_LOCALE)).toBe(true);
    expect(DEFAULT_LOCALE).toBe('en');
  });

  it('returns a known locale and falls back to the first entry', () => {
    expect(localeMeta('fr').nativeName).toBe('Français');
    // @ts-expect-error testing the runtime fallback for an invalid code
    expect(localeMeta('zz')).toBe(LOCALES[0]);
  });
});

describe('matchDeviceLocale', () => {
  it('matches a direct language code', () => {
    expect(matchDeviceLocale([{ languageCode: 'fr' }])).toBe('fr');
    expect(matchDeviceLocale([{ languageCode: 'DE' }])).toBe('de');
  });

  it('falls back to DEFAULT_LOCALE for an empty or unsupported list', () => {
    expect(matchDeviceLocale([])).toBe(DEFAULT_LOCALE);
    expect(matchDeviceLocale([{ languageCode: 'ru' }])).toBe(DEFAULT_LOCALE);
    expect(matchDeviceLocale([{ languageCode: null }])).toBe(DEFAULT_LOCALE);
  });

  it('walks the ranked list past unsupported entries to find a match', () => {
    expect(
      matchDeviceLocale([{ languageCode: 'ru' }, { languageCode: 'nl' }, { languageCode: 'en' }])
    ).toBe('nl');
  });

  it('maps any Portuguese variant to pt-BR, the only Portuguese this batch ships', () => {
    expect(matchDeviceLocale([{ languageCode: 'pt', regionCode: 'BR' }])).toBe('pt-BR');
    expect(matchDeviceLocale([{ languageCode: 'pt', regionCode: 'PT' }])).toBe('pt-BR');
    expect(matchDeviceLocale([{ languageCode: 'pt' }])).toBe('pt-BR');
  });

  it('maps Chinese to zh-Hans unless the script or region says Traditional', () => {
    expect(matchDeviceLocale([{ languageCode: 'zh' }])).toBe('zh-Hans');
    expect(matchDeviceLocale([{ languageCode: 'zh', regionCode: 'CN' }])).toBe('zh-Hans');
    expect(matchDeviceLocale([{ languageCode: 'zh', languageScriptCode: 'Hans' }])).toBe('zh-Hans');

    // Traditional falls through this entry rather than mismatching to the
    // Simplified catalog; with nothing else in the ranked list it lands on
    // DEFAULT_LOCALE.
    expect(matchDeviceLocale([{ languageCode: 'zh', languageScriptCode: 'Hant' }])).toBe(
      DEFAULT_LOCALE
    );
    expect(matchDeviceLocale([{ languageCode: 'zh', regionCode: 'TW' }])).toBe(DEFAULT_LOCALE);
    expect(matchDeviceLocale([{ languageCode: 'zh', regionCode: 'HK' }])).toBe(DEFAULT_LOCALE);
  });
});
