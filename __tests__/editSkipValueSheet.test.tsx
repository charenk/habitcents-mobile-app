/**
 * EditSkipValueSheet (app/habit/[id].tsx), ADR 0023 migration to AmountField.
 * No coverage existed before this sheet moved off the custom Keypad; the
 * component is exported (not just a local closure) specifically so it can be
 * tested in isolation here, without standing up the full habit detail
 * screen's provider stack.
 *
 * Pins: the field prefills and round-trips the habit's current skip value
 * (the whole point of opening this sheet is to change that number), a
 * pasted-shaped amount lands correctly, and a stray minus sign never
 * produces a negative cents value.
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
import { EditSkipValueSheet } from '@/app/habit/[id]';
import { strings } from '@/constants/strings';

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

type View = Awaited<ReturnType<typeof render>>;

const onCancel = jest.fn();
const onSave = jest.fn();

async function renderSheet(initialValue = 650): Promise<View> {
  const view = await render(
    <Providers>
      <EditSkipValueSheet
        visible
        initialValue={initialValue}
        onCancel={onCancel}
        onSave={onSave}
      />
    </Providers>
  );
  await act(async () => {});
  return view;
}

/** Types a full amount string into the native AmountField in one change
 *  (mirrors __tests__/expenseSheet.test.tsx's typeAmount helper). */
async function typeAmount(view: View, amount: string): Promise<void> {
  await act(async () => {
    fireEvent.changeText(view.getByLabelText(/^One skip keeps,/), amount);
  });
}

beforeEach(() => {
  onCancel.mockClear();
  onSave.mockClear();
});

afterEach(cleanup);

describe('EditSkipValueSheet', () => {
  it('prefills the field from the habit\'s current skip value', async () => {
    const view = await renderSheet(1250);
    expect(view.getByLabelText('One skip keeps, $12.50')).toBeTruthy();
  });

  it('Save with the field untouched round-trips the current value unchanged', async () => {
    const view = await renderSheet(1250);
    await act(async () => {
      fireEvent.press(view.getByRole('button', { name: strings.habitDetailV2.skipValueSave }));
    });
    expect(onSave).toHaveBeenCalledWith(1250);
  });

  it('reads a pasted-shaped amount correctly through the field', async () => {
    const view = await renderSheet(1250);
    await typeAmount(view, '1,234.56');
    await act(async () => {
      fireEvent.press(view.getByRole('button', { name: strings.habitDetailV2.skipValueSave }));
    });
    expect(onSave).toHaveBeenCalledWith(123456);
  });

  it('never lets a stray minus sign produce a negative cents value', async () => {
    const view = await renderSheet(1250);
    await typeAmount(view, '-5.00');
    await act(async () => {
      fireEvent.press(view.getByRole('button', { name: strings.habitDetailV2.skipValueSave }));
    });
    expect(onSave).toHaveBeenCalledWith(500);
  });

  it('Cancel closes without saving', async () => {
    const view = await renderSheet(1250);
    await act(async () => {
      fireEvent.press(view.getByRole('button', { name: strings.common.cancel }));
    });
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();
  });
});
