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

  it('keeps the tap target unchanged: both the amount card and the plus button open the sheet', async () => {
    const onOpenSheet = jest.fn();
    const view = await render(
      <Providers>
        <QuickLogRow onOpenSheet={onOpenSheet} />
      </Providers>
    );
    const targets = await view.findAllByLabelText(strings.today.quickLogOpenLabel);
    // The amount Pressable and the plus TouchableOpacity share this label
    // (QuickLogRow.tsx); both must still open the sheet after the fullWidth
    // change since the tap target itself did not move.
    expect(targets).toHaveLength(2);
    for (const target of targets) {
      fireEvent.press(target);
    }
    expect(onOpenSheet).toHaveBeenCalledTimes(2);
    expect(onOpenSheet).toHaveBeenCalledWith(undefined);
  });
});
