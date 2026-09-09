/**
 * utils/i18n: the typed catalog seam (plan item 2) plus the overlay/merge
 * machinery plan item 4 added. Covers the plumbing: getCatalog resolving
 * `en` to the base English catalog by reference, merging a locale's
 * provisional overlay onto English for the other 10 (falling back to
 * English for any key the overlay does not cover yet), memoizing per
 * locale, and useStrings threading through LocaleContext reactively
 * (mirrors useCurrency()). Per-locale overlay CONTENT (translation
 * correctness, schema shape, the locked-vocabulary guard) is covered
 * separately in __tests__/localeCatalogs.test.ts.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'en', languageScriptCode: null, regionCode: 'US' }],
}));

import React from 'react';
import { act, renderHook } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LocaleProvider, useLocale } from '@/contexts/LocaleContext';
import { strings } from '@/constants/strings';
import { getCatalog, useStrings } from '@/utils/i18n';

beforeEach(async () => {
  await AsyncStorage.clear();
});

function Wrapper({ children }: { children: React.ReactNode }) {
  return <LocaleProvider>{children}</LocaleProvider>;
}

describe('getCatalog', () => {
  it('resolves en to the base English catalog by reference', () => {
    expect(getCatalog('en')).toBe(strings);
  });

  it('overrides the translated slice for a locale with a provisional overlay', () => {
    const es = getCatalog('es');
    expect(es.common.save).toBe('Guardar');
    expect(es.tabs.today).toBe('Hoy');
    expect(es.screenTitles.money).toBe('Dinero.');
  });

  it('falls back to English for keys the overlay does not cover yet', () => {
    const es = getCatalog('es');
    // common.keep is locked vocabulary, deliberately withheld (see
    // locales/es.ts's header and HANDOFF.md's DECISIONS NEEDED).
    expect(es.common.keep).toBe(strings.common.keep);
    // habits is a whole section this run's overlay slice does not touch.
    expect(es.habits).toBe(strings.habits);
  });

  it('returns a stable (memoized) reference per locale across calls', () => {
    expect(getCatalog('fr')).toBe(getCatalog('fr'));
    expect(getCatalog('ja')).toBe(getCatalog('ja'));
  });

  it('never mutates the base English catalog', () => {
    getCatalog('de');
    getCatalog('ko');
    expect(strings.common.save).toBe('Save');
    expect(strings.tabs.today).toBe('Today');
  });
});

describe('useStrings', () => {
  it('throws outside LocaleProvider, same as useLocale', async () => {
    await expect(renderHook(() => useStrings())).rejects.toThrow(
      'useLocale must be used within LocaleProvider'
    );
  });

  it('returns the catalog for the active locale under LocaleProvider', async () => {
    const { result } = await renderHook(() => useStrings(), { wrapper: Wrapper });
    expect(result.current).toBe(strings);
    expect(result.current.common.save).toBe('Save');
  });

  it('re-resolves when the locale override changes', async () => {
    const { result } = await renderHook(
      () => ({ strings: useStrings(), locale: useLocale() }),
      { wrapper: Wrapper }
    );
    await act(async () => {});
    expect(result.current.locale.locale).toBe('en');

    await act(async () => {
      await result.current.locale.setOverride('fr');
    });
    expect(result.current.locale.locale).toBe('fr');
    // fr has a provisional overlay now (plan item 4): resolved freshly
    // through getCatalog for the new locale, not a stale English value.
    expect(result.current.strings).toBe(getCatalog('fr'));
    expect(result.current.strings.tabs.today).toBe('Aujourd’hui');
  });
});
