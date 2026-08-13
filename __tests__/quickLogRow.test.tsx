/**
 * QuickLogRow (components/money/QuickLogRow.tsx): pins the full-width amount
 * fix (cleanup unit A). The card's $0.00 used to hug the digits because
 * AmountDisplay shrink-wraps by default; QuickLogRow now passes fullWidth so
 * the underline spans from the card's left padding to the plus button, not
 * just the digits. See __tests__/uiPrimitives.test.tsx for the AmountDisplay
 * prop-level assertion this wiring depends on.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import React from 'react';
import { StyleSheet } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { QuickLogRow } from '@/components/money/QuickLogRow';
import { strings } from '@/constants/strings';

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <CurrencyProvider>{children}</CurrencyProvider>
    </ThemeProvider>
  );
}

describe('QuickLogRow', () => {
  it('renders the amount fullWidth so its underline stretches to the card, not just the digits', async () => {
    const view = await render(
      <Providers>
        <QuickLogRow onOpenSheet={() => {}} />
      </Providers>
    );
    const number = await view.findByText('0.00');
    // number Text -> row View -> AmountDisplay's own root View.
    const amountRoot = number.parent?.parent;
    const flat = StyleSheet.flatten(amountRoot?.props.style);
    expect(flat.alignSelf).toBe('stretch');
  });

  it('keeps a 12pt gap between the amount tap area and the plus button (review fix: flush underline)', async () => {
    const view = await render(
      <Providers>
        <QuickLogRow onOpenSheet={() => {}} />
      </Providers>
    );
    const number = await view.findByText('0.00');
    // number Text -> AmountDisplay root -> quickLogAmountTap Pressable -> quickLogAmountRow View.
    const amountRoot = number.parent?.parent;
    const tapArea = amountRoot?.parent;
    const row = tapArea?.parent;
    const flat = StyleSheet.flatten(row?.props.style);
    expect(flat.gap).toBe(12);
  });

  it('exposes exactly one accessible control for the log action, and both the amount card and the plus button still open the sheet by touch (UX-055)', async () => {
    // UX-055: the amount Pressable and the plus TouchableOpacity used to
    // share strings.today.quickLogOpenLabel, so VoiceOver announced the same
    // button twice in a row. The plus button is now hidden from the
    // accessibility tree (accessible={false}); only the amount tap area is
    // discoverable by assistive tech, though both remain live touch targets.
    const onOpenSheet = jest.fn();
    const view = await render(
      <Providers>
        <QuickLogRow onOpenSheet={onOpenSheet} />
      </Providers>
    );
    const targets = await view.findAllByLabelText(strings.today.quickLogOpenLabel);
    expect(targets).toHaveLength(1);
    fireEvent.press(targets[0]);
    expect(onOpenSheet).toHaveBeenCalledTimes(1);
    expect(onOpenSheet).toHaveBeenCalledWith(undefined);

    // The plus button is still a real touch target; it is only hidden from
    // assistive tech (RNTL's queries exclude accessibility-hidden elements
    // by default, hence includeHiddenElements here), not removed from the
    // tree or made non-functional.
    const plusButton = view.getByTestId('quick-log-plus', { includeHiddenElements: true });
    fireEvent.press(plusButton);
    expect(onOpenSheet).toHaveBeenCalledTimes(2);
  });
});
