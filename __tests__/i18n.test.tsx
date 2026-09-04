/**
 * utils/i18n (routine/localization, plan item 2, first slice): the typed
 * catalog seam. Only English exists this run (plan item 4 adds the other
 * 10), so these tests cover the plumbing itself: getCatalog resolving to
 * the same English catalog for every locale, and useStrings threading
 * through LocaleContext reactively (mirrors useCurrency()).
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
  it('resolves every locale to the English catalog for now', () => {
    expect(getCatalog('en')).toBe(strings);
    expect(getCatalog('fr')).toBe(strings);
    expect(getCatalog('ja')).toBe(strings);
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
    // Still the English catalog (no fr catalog exists yet), but resolved
    // freshly through getCatalog for the new locale, not a stale value.
    expect(result.current.strings).toBe(strings);
  });
});
