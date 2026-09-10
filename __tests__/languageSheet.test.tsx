/**
 * LanguageSheet (routine/localization plan item 1, updated for plan item
 * 4): mirrors __tests__/currencySheet.test.tsx. LanguageSheet itself was
 * converted to useStrings() in run 10 (PLAN.md), so once a locale's
 * overlay exists (item 4), the sheet's own chrome (like the Cancel button)
 * renders that locale's text for real, not just the row it selects. The
 * device is mocked to French for the whole file (see below), so
 * assertions on the sheet's own live text use getCatalog('fr'), not the
 * static English strings import, to match what actually renders.
 *
 * AsyncStorage is cleared between tests: LocaleProvider persists a
 * selected override across renders in the same process, and with real
 * overlays now in place a leaked override from one test (e.g. "selecting
 * de") would visibly change a later test's rendered text, not just its
 * state, unlike before item 4.
 */
jest.setTimeout(20000);

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// The device is fixed to French so DEFAULT_LOCALE (English "System default")
// is not also the device's own resolved language, keeping "System default"
// and "Français" distinguishable in these assertions.
jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'fr', languageScriptCode: null, regionCode: 'FR' }],
}));

import React from 'react';
import { act, cleanup, fireEvent, render } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { LocaleProvider } from '@/contexts/LocaleContext';
import { ToastProvider } from '@/components/ui/Toast';
import { LanguageSheet } from '@/components/settings/LanguageSheet';
import { strings } from '@/constants/strings';
import { getCatalog } from '@/utils/i18n';
import { selectableLabel } from '@/utils/a11y';
import { localeMeta } from '@/utils/locale';

function rowLabel(code: Parameters<typeof localeMeta>[0]) {
  const meta = localeMeta(code);
  return strings.settings.languageRowLabel(meta.nativeName, meta.englishName);
}

const initialMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <ThemeProvider>
        <LocaleProvider>
          <ToastProvider>{children}</ToastProvider>
        </LocaleProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

async function renderSheet(onClose = () => {}) {
  const view = await render(
    <Providers>
      <LanguageSheet visible onClose={onClose} />
    </Providers>
  );
  await act(async () => {});
  return view;
}

afterEach(async () => {
  cleanup();
  await AsyncStorage.clear();
});

describe('LanguageSheet', () => {
  it('lists System default plus every supported language, native name first', async () => {
    const view = await renderSheet();

    expect(view.getByText(getCatalog('fr').settings.languageSystemDefault)).toBeTruthy();
    expect(view.getByText(rowLabel('fr'))).toBeTruthy();
    expect(view.getByText(rowLabel('es'))).toBeTruthy();
    expect(view.getByText(rowLabel('pt-BR'))).toBeTruthy();
    expect(view.getByText(rowLabel('zh-Hans'))).toBeTruthy();
  });

  it('System default is selected until an override is set', async () => {
    const view = await renderSheet();

    const systemRow = view.getByLabelText(
      selectableLabel(getCatalog('fr').settings.languageSystemDefault, true)
    );
    expect(systemRow.props.accessibilityState).toMatchObject({ selected: true });

    const frenchRow = view.getByLabelText(selectableLabel(rowLabel('fr'), false));
    expect(frenchRow.props.accessibilityState).toMatchObject({ selected: false });
  });

  it('selecting a language applies the override and closes the sheet', async () => {
    const onClose = jest.fn();
    const view = await renderSheet(onClose);

    await act(async () => {
      fireEvent.press(view.getByLabelText(selectableLabel(rowLabel('de'), false)));
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('cancel is the only centered action and closes without selecting', async () => {
    const onClose = jest.fn();
    const view = await renderSheet(onClose);

    // No override set, so the sheet resolves to the mocked device locale
    // (French), and its own Cancel button renders fr's provisional
    // translation (LanguageSheet is useStrings()-converted), not the
    // static English string.
    await act(async () => {
      fireEvent.press(view.getByText(getCatalog('fr').common.cancel));
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
