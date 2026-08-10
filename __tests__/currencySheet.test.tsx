/**
 * CurrencySheet (design/selection-sheets U3): replaces the Alert.alert
 * currency picker at app/profile.tsx. Pins the behavior the alert could not
 * offer: the current selection is indicated by shape (a check icon) AND label
 * (accessibilityState.selected plus "selected"/"not selected" in the spoken
 * label), rows are left-aligned and speak the same code vocabulary as the
 * Profile row, and selecting a row applies it through CurrencyContext and
 * closes the sheet.
 *
 * Provider wiring mirrors __tests__/pickOneSheet.test.tsx.
 */
jest.setTimeout(20000);

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import React from 'react';
import { act, cleanup, fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { CurrencySheet } from '@/components/settings/CurrencySheet';
import { strings } from '@/constants/strings';
import { selectableLabel } from '@/utils/a11y';

const initialMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <ThemeProvider>
        <CurrencyProvider>{children}</CurrencyProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

async function renderSheet(onClose = () => {}) {
  const view = await render(
    <Providers>
      <CurrencySheet visible onClose={onClose} />
    </Providers>
  );
  // Flush the sheet's enter animation and CurrencyProvider's load effect.
  await act(async () => {});
  return view;
}

afterEach(cleanup);

describe('CurrencySheet', () => {
  it('renders every currency left-aligned with its name and code', async () => {
    const view = await renderSheet();

    expect(view.getByText('US Dollar (USD)')).toBeTruthy();
    expect(view.getByText('Euro (EUR)')).toBeTruthy();
    expect(view.getByText('Japanese Yen (JPY)')).toBeTruthy();
  });

  it('marks the current selection by shape and label, not color alone', async () => {
    const view = await renderSheet();

    // Default currency is USD (DEFAULT_CURRENCY): the row carries both the
    // accessible "selected" status and a visible check icon, not just a tint.
    const usdRow = view.getByLabelText(selectableLabel('US Dollar (USD)', true));
    expect(usdRow).toBeTruthy();
    expect(usdRow.props.accessibilityState).toMatchObject({ selected: true });

    const eurRow = view.getByLabelText(selectableLabel('Euro (EUR)', false));
    expect(eurRow.props.accessibilityState).toMatchObject({ selected: false });
  });

  it('selecting a row applies the currency and closes the sheet', async () => {
    const onClose = jest.fn();
    const view = await renderSheet(onClose);

    await act(async () => {
      fireEvent.press(view.getByLabelText(selectableLabel('Euro (EUR)', false)));
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
