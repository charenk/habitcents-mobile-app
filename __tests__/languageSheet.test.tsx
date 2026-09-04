/**
 * LanguageSheet (routine/localization plan item 1): mirrors
 * __tests__/currencySheet.test.tsx. Selecting a row only persists the
 * override for now; no catalog exists yet for it to visibly change, so this
 * only asserts the picker's own behavior (list, selection state, close).
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
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { LocaleProvider } from '@/contexts/LocaleContext';
import { ToastProvider } from '@/components/ui/Toast';
import { LanguageSheet } from '@/components/settings/LanguageSheet';
import { strings } from '@/constants/strings';
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

afterEach(cleanup);

describe('LanguageSheet', () => {
  it('lists System default plus every supported language, native name first', async () => {
    const view = await renderSheet();

    expect(view.getByText(strings.settings.languageSystemDefault)).toBeTruthy();
    expect(view.getByText(rowLabel('fr'))).toBeTruthy();
    expect(view.getByText(rowLabel('es'))).toBeTruthy();
    expect(view.getByText(rowLabel('pt-BR'))).toBeTruthy();
    expect(view.getByText(rowLabel('zh-Hans'))).toBeTruthy();
  });

  it('System default is selected until an override is set', async () => {
    const view = await renderSheet();

    const systemRow = view.getByLabelText(
      selectableLabel(strings.settings.languageSystemDefault, true)
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

    await act(async () => {
      fireEvent.press(view.getByText(strings.common.cancel));
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
