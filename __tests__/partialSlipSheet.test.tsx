/**
 * PartialSlipSheet (ADR 0023 migration to AmountField). No coverage existed
 * before this sheet moved off the custom Keypad; these tests pin the parts
 * the migration could plausibly break: the field auto-focuses (there's
 * nothing to check before typing, per the component's own doc comment), a
 * pasted-shaped amount lands correctly through the field the same way
 * __tests__/expenseSheet.test.tsx's typeAmount helper exercises it, and a
 * stray minus sign (defensive: the decimal pad has no minus key, but a paste
 * can carry one) never produces a negative cents value.
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
import { ToastProvider } from '@/components/ui/Toast';
import { PartialSlipSheet } from '@/components/habit-logging/PartialSlipSheet';
import { strings } from '@/constants/strings';

const initialMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <ThemeProvider>
        <CurrencyProvider>
          <ToastProvider>{children}</ToastProvider>
        </CurrencyProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

type View = Awaited<ReturnType<typeof render>>;

const onCancel = jest.fn();
const onSave = jest.fn();

async function renderSheet(skipValue = 650): Promise<View> {
  const view = await render(
    <Providers>
      <PartialSlipSheet visible skipValue={skipValue} onCancel={onCancel} onSave={onSave} />
    </Providers>
  );
  // Flush the sheet's enter animation.
  await act(async () => {});
  return view;
}

/** Types a full amount string into the native AmountField in one change,
 *  the way a decimal-pad keystroke stream ultimately resolves to a value
 *  (mirrors __tests__/expenseSheet.test.tsx's typeAmount helper). */
async function typeAmount(view: View, amount: string): Promise<void> {
  await act(async () => {
    fireEvent.changeText(view.getByLabelText(/^Amount spent,/), amount);
  });
}

beforeEach(() => {
  onCancel.mockClear();
  onSave.mockClear();
});

afterEach(cleanup);

describe('PartialSlipSheet', () => {
  it('opens with an empty amount, not a leftover from the last slip', async () => {
    const view = await renderSheet();
    expect(view.getByLabelText('Amount spent, $0.00')).toBeTruthy();
  });

  it('renders the usual-spend subtitle from the habit skip value', async () => {
    const view = await renderSheet(1250);
    expect(view.getByText(strings.habitLogging.partialSheetSubtitle('$12.50'))).toBeTruthy();
  });

  it('reads a pasted-shaped amount correctly through the field', async () => {
    const view = await renderSheet();
    await typeAmount(view, '1,234.56');
    await act(async () => {
      fireEvent.press(view.getByRole('button', { name: strings.common.save }));
    });
    expect(onSave).toHaveBeenCalledWith(123456);
  });

  it('never lets a stray minus sign produce a negative cents value', async () => {
    const view = await renderSheet();
    await typeAmount(view, '-5.00');
    await act(async () => {
      fireEvent.press(view.getByRole('button', { name: strings.common.save }));
    });
    expect(onSave).toHaveBeenCalledWith(500);
  });

  it('scrim close dismisses without saving (no in-sheet Cancel since ADR 0031)', async () => {
    const view = await renderSheet();
    await act(async () => {
      fireEvent.press(view.getByRole('button', { name: strings.common.close }));
    });
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();
    expect(view.queryByText(strings.common.cancel)).toBeNull();
  });

  // UX-020: a $0.00 save would silently credit the entire skip value on a day
  // the user just said they bought something (see PartialSlipSheet's
  // handleSave doc comment). Disabled-until-valid (ops ADR 0028, 2026-08-16):
  // Save is disabled at the empty default rather than live-and-toasting.
  it('disables Save until an amount is entered, then saves on press', async () => {
    const view = await renderSheet();

    const disabledSave = view.getByRole('button', { name: strings.common.save });
    expect(disabledSave.props.accessibilityState?.disabled).toBe(true);
    expect(disabledSave.props.accessibilityHint).toBe(strings.sheets.saveHintAmount);

    // A press on a disabled Button never reaches onPress (Button.tsx passes
    // `disabled` straight to Pressable), so this pins that the control itself
    // blocks the save, not just that nobody happened to press it.
    await act(async () => {
      fireEvent.press(disabledSave);
    });
    expect(onSave).not.toHaveBeenCalled();

    await typeAmount(view, '5');

    const enabledSave = view.getByRole('button', { name: strings.common.save });
    expect(enabledSave.props.accessibilityState?.disabled).toBe(false);
    expect(enabledSave.props.accessibilityHint).toBeUndefined();

    await act(async () => {
      fireEvent.press(enabledSave);
    });
    expect(onSave).toHaveBeenCalledWith(500);
  });
});
